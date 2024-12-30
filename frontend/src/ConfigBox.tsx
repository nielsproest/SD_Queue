import { useState, useEffect } from "react";
import axios from "axios";
import './App.css';

export default function StatusBox() {
	const [config, setConfig] = useState<any | null>(null);
	const [showRaw, setShowRaw] = useState(false);
	const [debouncedValue, setDebouncedValue] = useState(config);
	const debounceTimer = 2000;

	useEffect(() => {
		axios.get("/config").then((response) => {
			const value = JSON.stringify(response.data, null, "\t");
			setConfig(value);
			setDebouncedValue(value);
		})
	}, []);

	const onConfigChange = (value) => {
		const json = JSON.stringify(value);
		axios.post('/config', json, {
			headers: {
				// Overwrite Axios's automatically set Content-Type
				'Content-Type': 'application/json'
			}
		});
		
		// Prettify
		setConfig(JSON.stringify(value, null, "\t"));
	}

	// Debounce effect to update the parent when debouncedValue changes
	useEffect(() => {
		const handler = setTimeout(() => {
		try {
			const parsed = JSON.parse(debouncedValue);
			onConfigChange(parsed); // Send the parsed value to the parent
		} catch (err) {
			console.error("Invalid JSON:", err);
		}
		}, debounceTimer);

		return () => clearTimeout(handler); // Cleanup timeout
	}, [debouncedValue, onConfigChange]);
	
	if (!config) {
		return <p>Loading config...</p>;
	}

	const handleChange = (e) => {
		const value = e.target.value;
		setConfig(value);
		setDebouncedValue(value); // Trigger debounce
	};
	
	return (
		<div className="status-box">
  			<div className="status-section">
				<h2>Config</h2>
				
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
					{showRaw ? "Hide Raw Config" : "Show Raw Config"}
					</button>
				</div>
				<textarea 
					className={`raw-json ${showRaw ? "visible" : "hidden"}`} 
					style={{minHeight: "400px"}}
					value={config}
					onChange={handleChange}
				/>
			</div>
		</div>
	);
}
