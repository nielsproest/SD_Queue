import { useState, useEffect } from "react";
import './App.css';

function QueueRow({ item }: { item: { prompt: string } }) {
	return (
		<td>
			<div style={{
				position: "relative",
				maxHeight: "100px",
				overflow: "auto",
				border: "1px solid #ccc",
				padding: "5px",
			}}>
				<pre style={{ 
					whiteSpace: "pre-wrap", 
					wordBreak: "break-word",
					padding: 0,
					margin: 0,
				}}>{item.prompt}</pre>
			</div>
		</td>
	);
}

export default function QueueList({ queue, setQueue, refreshQueue }) {
	useEffect(() => {
		// Fetch initial queue
		refreshQueue()

		// Set up WebSocket connection
		const ws = new WebSocket("/ws");

		ws.onmessage = (event) => {
			/*const updatedItem = JSON.parse(event.data);
			setQueue((prevQueue) =>
				prevQueue.map((item) =>
					item.id === updatedItem.id ? updatedItem : item
				)
			);*/
			refreshQueue();
		};

		ws.onclose = () => {
			console.log("WebSocket disconnected");
		};

		return () => {
			ws.close();
		};
	}, []);

	return (
		<div className="queue-list">
			<h1>Stable Diffusion Queue</h1>
			<div className="table-container">
				<table>
					<thead>
						<tr>
							<th>ID</th>
							<th>Prompt</th>
							<th>Status</th>
							<th>Result URL</th>
							<th>Created At</th>
							<th>Batch Count</th>
						</tr>
					</thead>
					<tbody>
						{queue.filter((item) => item.status !== "done").map((item) => (
							<tr key={item.id}>
								<td>{item.id}</td>
								<QueueRow item={item}/>
								<td>{item.status}</td>
								<td>{item.result_url ? <a href={item.result_url}>View</a> : "N/A"}</td>
								<td>{new Date(item.created_at).toLocaleString()}</td>
								<td>{item.batch_count}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
