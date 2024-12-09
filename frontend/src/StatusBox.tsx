import { useState, useEffect } from "react";
import axios from "axios";
import './App.css';

type StatusData = {
	progress: number;
	eta_relative: number;
	state: {
		skipped: boolean;
		interrupted: boolean;
		stopping_generation: boolean;
		job: string;
		job_count: number;
		job_timestamp: string;
		job_no: number;
		sampling_step: number;
		sampling_steps: number;
	};
	current_image: string | null;
	textinfo: string | null;
};

export default function StatusBox() {
	const [status, setStatus] = useState<StatusData | null>(null);
	const [showRaw, setShowRaw] = useState(false);

	useEffect(() => {
		let isFetching = false; 

		const fetchStatus = async () => {
			if (isFetching) return;

			try {
				isFetching = true; 
				const response = await axios.get("/status");
				setStatus(response.data);
			} catch (error) {
				console.error("Failed to fetch status", error);
			} finally {
				isFetching = false;
			}
		};

		// Fetch status every 2 seconds
		const interval = setInterval(fetchStatus, 2000);
		fetchStatus(); // Initial fetch
		return () => clearInterval(interval);
	}, []);

	if (!status) {
		return <p>Loading status...</p>;
	}

	const progressPercentage = (status.progress * 100).toFixed(2);
	const etaSeconds = (status.eta_relative).toFixed(1);

	return (
		<div className="status-box">
			<h2>Status</h2>
			<div className="status-details">
				<strong>Progress:</strong> {progressPercentage}% <br />
				<strong>ETA:</strong> {etaSeconds} seconds <br />
			</div>
			<div>
				<button
					onClick={() => setShowRaw((prev) => !prev)}
					style={{
						padding: "5px 10px",
						backgroundColor: "#007BFF",
						color: "#fff",
						border: "none",
						borderRadius: "3px",
						cursor: "pointer",
						marginBottom: "10px",
					}}
				>
				{showRaw ? "Hide Raw JSON" : "Show Raw JSON"}
				</button>
			</div>
			{showRaw && (
				<pre
					style={{
						padding: "10px",
						borderRadius: "5px",
						overflow: "auto",
						maxHeight: "300px",
						wordWrap: "break-word",
						border: "1px solid #ccc"
					}}
				>
				{JSON.stringify(status, null, 2)}
				</pre>
			)}
			<div style={{ flexShrink: 0 }}>
				<h3>Current Image:</h3>
				{status.current_image && (
					<img 
						src={`data:image/png;base64,${status.current_image}`} 
						alt="Current generated image"
						style={{ width: '500px', height: '500px', objectFit: 'contain' }} 
					/>
				)}
			</div>
		</div>
	);
}
