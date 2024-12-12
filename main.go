package main

import (
	"database/sql"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

type QueueItem struct {
	ID        int            `db:"id" json:"id"`
	Prompt    string         `db:"prompt" json:"prompt"`
	Status    string         `db:"status" json:"status"`
	ResultURL sql.NullString `db:"result_url" json:"result_url"`
	BatchSize int            `db:"batch_size" json:"batch_size"`
	CreatedAt time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt time.Time      `db:"updated_at" json:"updated_at"`
}

var (
	db *sqlx.DB

	sd_url = "http://127.0.0.1:7860"
	port   = "8321"

	batches = 1
)

//go:embed frontend/build/*
var frontend embed.FS

//go:embed migrations/*
var migrations embed.FS

func main() {
	if mp := os.Getenv("PORT"); mp != "" {
		port = mp
	}
	if mp := os.Getenv("SD_URL"); mp != "" {
		sd_url = mp
	}
	if mp := os.Getenv("BATCH_SIZE"); mp != "" {
		batches, _ = strconv.Atoi(mp)
	}

	var err error
	db, err = sqlx.Connect("sqlite3", "./main.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	//Bootstrap()
	go ProcessQueue2()
	RegRoutes()
}

func Bootstrap() {
	// TODO: Migration
	subFS, _ := fs.Sub(migrations, "migrations")
	c, err := fs.ReadFile(subFS, "2_batches.sql")
	if err != nil {
		log.Fatal(err)
	}

	sql := string(c)
	_, err = db.Exec(sql)
	if err != nil {
		log.Fatal(err)
	}
}

func RegRoutes() {
	// API Routes
	http.HandleFunc("/queue", handleQueue)
	http.HandleFunc("/config", handleConfig)
	http.HandleFunc("/status", handleStatus)

	// WebSocket route
	http.HandleFunc("/ws", wsHandler)

	// Frontend route
	subFS, _ := fs.Sub(frontend, "frontend/build")
	http.Handle("/", http.FileServer(http.FS(subFS)))

	// Listen
	log.Printf("Listening " + port + "...\n")
	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Fatalf("Failed to open port " + port + "\n")
	}
}
