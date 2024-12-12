package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var (
	// WebSocket upgrader
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	// Connected WebSocket clients
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex

	// Job is a struct containing job data
	queue = make(chan QueueItem, 255)

	// API Endpoints
	api_txt2img  = "/sdapi/v1/txt2img"
	api_progress = "/sdapi/v1/progress"
)

type ConfigItem struct {
	ID   int    `db:"id" json:"id"`
	Data string `db:"data" json:"data"`
}

func ProcessQueue2() {
	queu := []QueueItem{}
	err := db.Select(&queu, "SELECT * FROM stable_diffusion_queue WHERE status='pending'")
	// TODO: Status should be enum

	if err != nil {
		log.Fatalf("Fetching error %v\n", err)
		return
	}

	for _, item := range queu {
		queue <- item
	}

	for job := range queue {
		if err := handleGen(job); err != nil {
			log.Printf("Generation error %v\n", err)
		}
	}
}

func handleGen(item QueueItem) error {
	log.Printf("Submitting image...\n")
	config := make(map[string]interface{})

	var jsonData []byte
	err := db.Get(&jsonData, "SELECT data FROM stable_diffusion_config")
	if err != nil || len(jsonData) == 0 {
		return fmt.Errorf("empty config: %v", err)
	}

	// Unmarshal into map
	if err = json.Unmarshal(jsonData, &config); err != nil {
		return fmt.Errorf("error unmarshaling JSON: %v", err)
	}

	config["prompt"] = item.Prompt

	// Marshal into data
	if jsonData, err = json.Marshal(&config); err != nil {
		return fmt.Errorf("error marshaling JSON: %v", err)
	}

	for i := range item.BatchSize {
		// TODO: Mark as submitted to survive restarts?
		_, err := http.Post(sd_url+api_txt2img, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			return fmt.Errorf("error unmarshaling JSON %d: %v", i, err)
		}

		/*jsonData, err = io.ReadAll(r.Body)
		if err != nil {
			return fmt.Errorf("read error: %v", err)
		}*/
	}

	item.Status = "done"
	//item.ResultURL = resp.Body.Json()["url"]
	//log.Printf("Response: %v\n", string(jsonData))
	log.Printf("Done!\n")
	return updateQueueItem(item)
}

func handleConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		bytedata, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Read error", http.StatusInternalServerError)
			log.Printf("read error %v\n", err)
			return
		}

		// Use a query to either insert or update the single row
		query := `
			INSERT INTO stable_diffusion_config (id, data)
			VALUES (1, $1)
			ON CONFLICT (id)
			DO UPDATE SET data = EXCLUDED.data
		`

		// Execute the query
		_, err = db.Exec(query, string(bytedata))
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			log.Printf("database error %v\n", err)
			return
		}

		w.WriteHeader(http.StatusOK)
	case http.MethodGet:
		var item ConfigItem

		err := db.Get(&item, "SELECT * FROM stable_diffusion_config")
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			log.Printf("database error %v\n", err)
			return
		}

		json.NewEncoder(w).Encode(item)
	default:
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	resp, err := http.Get(sd_url + api_progress)
	if err != nil {
		http.Error(w, "Fetching status error", http.StatusInternalServerError)
		log.Printf("Fetching status error %v\n", err)
		return
	}

	if _, err := io.Copy(w, resp.Body); err != nil {
		http.Error(w, "Failed to copy response body", http.StatusInternalServerError)
		log.Printf("error copying response body: %v\n", err)
		return
	}
}

func handleQueue(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		var item QueueItem
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			log.Printf("Database error %v\n", err)
			return
		}

		if item.BatchSize > batches {
			log.Printf("WARNING: Batch size was bigger than allowed (%d > %d), clamping...\n", item.BatchSize, batches)
			item.BatchSize = batches
		}

		err := db.Get(&item, "INSERT INTO stable_diffusion_queue (prompt, batch_size) VALUES ($1, $2) RETURNING *", item.Prompt, item.BatchSize)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			log.Printf("Database error %v\n", err)
			return
		}

		log.Printf("Add to queue... %v\n", item.ID)
		queue <- item

		json.NewEncoder(w).Encode(item)
	case http.MethodGet:
		queue := []QueueItem{}
		err := db.Select(&queue, "SELECT * FROM stable_diffusion_queue")
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			log.Printf("Database error %v\n", err)
			return
		}
		json.NewEncoder(w).Encode(queue)
	case http.MethodDelete:
		var item QueueItem
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			log.Printf("Database error %v\n", err)
			return
		}

		_, err := db.Exec("DELETE FROM stable_diffusion_queue WHERE id = $1", item.ID)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			log.Printf("Database error %v\n", err)
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}

// WebSocket handler to register clients
func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		return
	}

	// Register the client
	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()

	// Handle disconnection
	defer func() {
		clientsMu.Lock()
		delete(clients, conn)
		clientsMu.Unlock()
		conn.Close()
	}()

	// Keep the connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// Function to broadcast updates to all connected clients
func broadcastUpdate(update QueueItem) {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	message, _ := json.Marshal(update)
	for conn := range clients {
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			conn.Close()
			delete(clients, conn)
		}
	}
}

func updateQueueItem(item QueueItem) error {
	_, err := db.Exec("UPDATE stable_diffusion_queue SET status = $1, result_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3", item.Status, item.ResultURL, item.ID)
	if err != nil {
		return fmt.Errorf("database error %v", err)
	}

	// Broadcast the update
	// TODO: Consider sending them all
	broadcastUpdate(item)

	return nil
}
