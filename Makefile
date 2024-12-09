.PHONY: all frontend run

# Default target
all: frontend run

# Step 1: Build the frontend
frontend:
	@echo "Building the frontend..."
	cd frontend && bun run build

# Step 2: Run the Go backend
run:
	@echo "Running the Go backend..."
	go run .
