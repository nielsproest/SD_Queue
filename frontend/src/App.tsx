import { useState, useEffect } from "react";
import QueueList from "./QueueList";
import SubmitPrompt from "./SubmitPrompt";
import StatusBox from "./StatusBox";
import axios from "axios";
import './App.css';

export default function App() {
	const [queue, setQueue] = useState([]);

	const refreshQueue = () => {
		axios.get("/queue").then((response) => {
			setQueue(response.data);
		});
	}

	const addToQueue = (prompt: string) => {
		setQueue((prevQueue) => [...prevQueue, prompt]);
		refreshQueue();
	};

	return (
	<div className="app">
		{/* Top row: Queue and Submission */}
		<div className="main-container">
			<QueueList queue={queue} setQueue={setQueue} refreshQueue={refreshQueue} />
			<SubmitPrompt queue={queue} addToQueue={addToQueue} />
		</div>

		{/* Bottom row: Status Box */}
		<StatusBox />
	</div>
	);
}
