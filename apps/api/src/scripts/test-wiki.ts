
import { fetchWikipediaSummary } from "../services/wikipedia.js";

async function run() {
    const query = "Winston Churchill";
    console.log(`Fetching summary for '${query}'...`);

    const result = await fetchWikipediaSummary(query);

    if (result) {
        console.log("SUCCESS:");
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.error("FAILURE: Result was null");
    }
}

run();
