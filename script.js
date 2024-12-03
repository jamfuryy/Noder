// script.js

// SVG and dimensions
const svg = d3.select("#network")
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight);

let width = window.innerWidth;
let height = window.innerHeight;

// Attach event listeners to sliders to update displayed values
const sliders = [
    { sliderId: 'nodeCount', displayId: 'nodeCountValue' },
    { sliderId: 'minConnections', displayId: 'minConnectionsValue' },
    { sliderId: 'maxConnections', displayId: 'maxConnectionsValue' },
    { sliderId: 'minNodeRadius', displayId: 'minNodeRadiusValue' },
    { sliderId: 'maxNodeRadius', displayId: 'maxNodeRadiusValue' },
    { sliderId: 'minLineLength', displayId: 'minLineLengthValue' },
    { sliderId: 'maxLineLength', displayId: 'maxLineLengthValue' },
];

// Add window resize listener after the existing code
window.addEventListener('resize', () => {
    // Update SVG dimensions
    width = window.innerWidth;
    height = window.innerHeight;

    svg
        .attr("width", width)
        .attr("height", height);

    // Update force center
    if (simulation) {
        simulation.force("center", d3.forceCenter(width / 2, height / 2));
        simulation.alpha(0.3).restart();
    }
});


sliders.forEach(({ sliderId, displayId }) => {
    const slider = document.getElementById(sliderId);
    slider.addEventListener('input', () => {
        updateSliderValue(sliderId, displayId);
        generateNetwork(); // Add this line to regenerate on every slider change
    });
});

// Define variables to hold nodes and links
let nodes = [], links = [];
let simulation;

// Function to initialize or update the network
function generateNetwork() {
    // Clear existing SVG elements
    svg.selectAll("*").remove();

    // Read values from sliders
    const nodeCount = +document.getElementById("nodeCount").value;
    const minConnections = +document.getElementById("minConnections").value;
    const maxConnections = +document.getElementById("maxConnections").value;
    const minNodeRadius = +document.getElementById("minNodeRadius").value;
    const maxNodeRadius = +document.getElementById("maxNodeRadius").value;
    const minLineLength = +document.getElementById("minLineLength").value;
    const maxLineLength = +document.getElementById("maxLineLength").value;

    // Ensure min values are not greater than max values
    if (minConnections > maxConnections) {
        alert("Min Connections cannot be greater than Max Connections.");
        return;
    }

    if (minNodeRadius > maxNodeRadius) {
        alert("Min Node Radius cannot be greater than Max Node Radius.");
        return;
    }

    if (minLineLength > maxLineLength) {
        alert("Min Line Length cannot be greater than Max Line Length.");
        return;
    }

    // Generate nodes with variable radii
    nodes = d3.range(nodeCount).map((d, i) => ({
        id: i,
        radius: Math.random() * (maxNodeRadius - minNodeRadius) + minNodeRadius
    }));

    // Generate links connecting the nodes
    links = [];

    // For each node, determine a random number of connections
    nodes.forEach((node, i) => {
        let numConnections = Math.floor(Math.random() * (maxConnections - minConnections + 1)) + minConnections;

        // Connect to random nodes
        for (let j = 0; j < numConnections; j++) {
            let targetIndex = Math.floor(Math.random() * nodeCount);
            if (targetIndex !== i) {
                links.push({
                    source: node.id,
                    target: targetIndex,
                    length: Math.random() * (maxLineLength - minLineLength) + minLineLength
                });
            }
        }
    });

    // Remove duplicate links and self-loops
    links = links.filter((link, index, self) =>
        link.source !== link.target &&
        index === self.findIndex((l) => (
            (l.source === link.source && l.target === link.target) ||
            (l.source === link.target && l.target === link.source)
        ))
    );

    // Initialize simulation
    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links)
            .id(d => d.id)
            .distance(d => d.length)
            .strength(2)) // Increased link strength for better spacing
        .force("charge", d3.forceManyBody()
            .strength(-200)  // Increased repulsion
            .distanceMax(300)) // Limit the repulsion range
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide()
            .radius(d => d.radius * 2)  // Increased collision radius
            .strength(1.5))  // Increased collision strength
        .force("x", d3.forceX(width / 2).strength(0.2))
        .force("y", d3.forceY(height / 2).strength(0.2))
        .force("boundary", () => {
            nodes.forEach(node => {
                node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
                node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
            });
        });


    // Draw links
    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("path")  // Changed from "line" to "path"
        .data(links)
        .enter().append("path")  // Changed from "line" to "path"
        .attr("fill", "none")
        .attr("stroke", "#161616")
        .attr("stroke-width", 1);

    // Draw nodes
    const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", d => d.radius)
        .attr("fill", "#FFDE00")
        .attr("stroke", "#161616")
        .attr("stroke-width", 1)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Simulation tick
    simulation.on("tick", () => {
        // Calculate center point
        const centerX = width / 2;
        const centerY = height / 2;

        link.attr("d", d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dr = Math.sqrt(dx * dx + dy * dy);

            // Calculate midpoint
            const midX = (d.source.x + d.target.x) / 2;
            const midY = (d.source.y + d.target.y) / 2;

            // Push the curve away from the center by inverting the direction
            const pullFactor = -0.2; // Negative value pushes away from center
            const controlX = midX + (centerX - midX) * pullFactor;
            const controlY = midY + (centerY - midY) * pullFactor;

            return `M${d.source.x},${d.source.y} Q${controlX},${controlY} ${d.target.x},${d.target.y}`;
        });

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });

}

// Drag functions
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// Update displayed values for sliders
function updateSliderValue(sliderId, displayId) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    display.textContent = slider.value;
}

sliders.forEach(({ sliderId, displayId }) => {
    const slider = document.getElementById(sliderId);
    slider.addEventListener('input', () => {
        updateSliderValue(sliderId, displayId);
        generateNetwork();
    });
});

// Generate network on button click
document.getElementById("generateBtn").onclick = generateNetwork;

// Initialize all slider display values
sliders.forEach(({ sliderId, displayId }) => {
    updateSliderValue(sliderId, displayId);
});

// Initial generation
generateNetwork();

// Export SVG
document.getElementById("exportBtn").onclick = exportSVG;

function exportSVG() {
    const svgElement = document.getElementById("network");
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);

    // Add namespace if missing
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Create a data URL
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

    // Create a link and trigger download
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "network.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}