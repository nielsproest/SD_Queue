import { useState, useEffect } from "react";
import axios from "axios";
import './App.css';

export default function SubmitPrompt({ queue, addToQueue }) {
	const [prompt, setPrompt] = useState("");
	const [initialized, setInitialized] = useState(false); // Guard flag
	const [batchSize, setBatchSize] = useState(1);

	const handleSubmit = (e) => {
		e.preventDefault();
		axios.post("/queue", { prompt, batch_size: batchSize })
			.then(() => {
				addToQueue({prompt: prompt});
				//setPrompt("");
			})
			.catch((err) => {
				alert("Error submitting prompt");
			});
	};

	// Auto-fill the prompt with the latest item from the queue on initial load
	useEffect(() => {
		if (!initialized && queue.length > 0) {
			setPrompt(queue[queue.length - 1].prompt); // Use the latest prompt
			setInitialized(true); // Prevent further auto-fills
		}
	}, [queue, initialized]); // Dependency array

	return (
		<div className="submit-prompt">
			<h2>Submit Prompt</h2>
			<form onSubmit={handleSubmit}>
				<textarea
					name="prompt"
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
					placeholder="Enter your prompt"
					required
				/>
				<div className="batch-size-group">
					<label htmlFor="batch_size">Batch Size:</label>
					<select
						name="batch_size"
						id="batch_size"
						value={batchSize}
						onChange={(e) => setBatchSize(Number(e.target.value))}
					>
						<option value="1">1</option>
						<option value="2">2</option>
						<option value="3">3</option>
						<option value="4">4</option>
					</select>
				</div>
				<button type="submit">Submit</button>
			</form>
		</div>
	);
};
