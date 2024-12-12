import { useState, useEffect } from "react";
import axios from "axios";
import './App.css';

export default function SubmitPrompt({ queue, addToQueue }) {
	const [prompt, setPrompt] = useState("");
	const [initialized, setInitialized] = useState(false); // Guard flag
	const [batchCount, setBatchCount] = useState("1");

	const handleSubmit = (e) => {
		e.preventDefault();
		axios.post("/queue", { prompt, batch_count: Number(batchCount) })
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
			const lastPrompt = queue[queue.length - 1];
			setPrompt(lastPrompt.prompt); // Use the latest prompt
			setBatchCount(lastPrompt.batch_count); // Use the latest prompt
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
				<div className="batch-count-group">
					<label htmlFor="batch_count">Batch Count:</label>
					<select
						name="batch_count"
						id="batch_count"
						value={batchCount}
						onChange={(e) => setBatchCount(e.target.value)}
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
