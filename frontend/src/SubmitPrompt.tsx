import { useState } from "react";
import axios from "axios";
import './App.css';

export default function SubmitPrompt({ addToQueue }) {
	const [prompt, setPrompt] = useState("");

	const handleSubmit = (e) => {
		e.preventDefault();
		axios.post("/queue", { prompt })
			.then(() => {
				addToQueue({prompt: prompt});
				//setPrompt("");
			})
			.catch((err) => {
				alert("Error submitting prompt");
			});
	};

	return (
		<div className="submit-prompt">
			<h2>Submit Prompt</h2>
			<form onSubmit={handleSubmit}>
				<h2>Submit a Prompt</h2>
				<textarea
					name="prompt"
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
					placeholder="Enter your prompt"
					required
				/>
				<button type="submit">Submit</button>
			</form>
		</div>
	);
};
