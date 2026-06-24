// terminal-searxng.js

const readline = require("readline");
const { exec } = require("child_process");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let currentResults = [];

async function search(query) {
    try {
        const url = `http://localhost:8088/search?q=${encodeURIComponent(query)}&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        currentResults = data.results || [];

        console.clear();

        console.log(`\nSearch Results for "${query}"\n`);

        if (currentResults.length === 0) {
            console.log("No results found.\n");
            promptSearch();
            return;
        }

        currentResults.forEach((result, index) => {
            console.log(`[${index + 1}] ${result.title}`);
            console.log(`    ${result.url}`);

            if (result.content) {
                console.log(`    ${result.content.substring(0, 150)}...`);
            }

            console.log("");
        });

        promptSelection();

    } catch (err) {
        console.error("Search failed:", err.message);
        promptSearch();
    }
}

function promptSearch() {
    rl.question("Search (or q to quit): ", (query) => {

        if (query.toLowerCase() === "q") {
            rl.close();
            return;
        }

        search(query);
    });
}

function promptSelection() {
    rl.question(
        "\nEnter result number, s for new search, q to quit: ",
        (answer) => {

            if (answer === "q") {
                rl.close();
                return;
            }

            if (answer === "s") {
                promptSearch();
                return;
            }

            const num = parseInt(answer);

            if (
                !isNaN(num) &&
                num >= 1 &&
                num <= currentResults.length
            ) {
                openBrowser(currentResults[num - 1].url);
            }

            promptSelection();
        }
    );
}

function openBrowser(url) {

    const command =
        process.platform === "win32"
            ? `start "" "${url}"`
            : process.platform === "darwin"
            ? `open "${url}"`
            : `xdg-open "${url}"`;

    exec(command, (error) => {
        if (error) {
            console.error("Failed to open browser:", error.message);
        }
    });
}

promptSearch();
