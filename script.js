// Define variables and functions first
let nodes = [], links = [];
let simulation;
let width = window.innerWidth;
let height = window.innerHeight;
let isDashedLines = false;

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// SVG and dimensions
const svg = d3.select("#network")
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight);

// Slider configuration
const sliders = [
    { sliderId: 'nodeCount', displayId: 'nodeCountValue' },
    { sliderId: 'minConnections', displayId: 'minConnectionsValue' },
    { sliderId: 'maxConnections', displayId: 'maxConnectionsValue' },
    { sliderId: 'minNodeRadius', displayId: 'minNodeRadiusValue' },
    { sliderId: 'maxNodeRadius', displayId: 'maxNodeRadiusValue' },
    { sliderId: 'minDistance', displayId: 'minDistanceValue' },
    { sliderId: 'maxDistance', displayId: 'maxDistanceValue' },
    { sliderId: 'connectionRadius', displayId: 'connectionRadiusValue' },
];

// Function to initialize or update the network
function generateNetwork() {
    svg.selectAll("*").remove();

    const nodeCount = +document.getElementById("nodeCount").value;
    const minConnections = +document.getElementById("minConnections").value;
    const maxConnections = +document.getElementById("maxConnections").value;
    const minNodeRadius = +document.getElementById("minNodeRadius").value;
    const maxNodeRadius = +document.getElementById("maxNodeRadius").value;
    const minDistance = +document.getElementById("minDistance").value;
    const maxDistance = +document.getElementById("maxDistance").value;

    if (minConnections > maxConnections || minNodeRadius > maxNodeRadius || minDistance > maxDistance) {
        alert("Min values cannot be greater than Max values.");
        return;
    }

    nodes = d3.range(nodeCount).map((d, i) => {
        const randomFactor = Math.pow(Math.random(), 4);
        const radius = minNodeRadius + (maxNodeRadius - minNodeRadius) * randomFactor;
        const centeringForce = Math.pow(radius / minNodeRadius, 2);
        return {
            id: i,
            radius: radius,
            centeringForce: centeringForce
        };
    });

    links = [];
    const connectionRadius = +document.getElementById("connectionRadius").value;

    nodes.forEach(node => {
        node.x = Math.random() * width;
        node.y = Math.random() * height;
    });

    nodes.forEach((node, i) => {
        let numConnections = Math.floor(Math.random() * (maxConnections - minConnections + 1)) + minConnections;
        const nearbyNodes = nodes.filter((otherNode, j) => {
            if (i === j) return false;
            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;
            return Math.sqrt(dx * dx + dy * dy) <= connectionRadius;
        });

        if (nearbyNodes.length > 0) {
            for (let j = 0; j < Math.min(numConnections, nearbyNodes.length); j++) {
                const randomIndex = Math.floor(Math.random() * nearbyNodes.length);
                const targetNode = nearbyNodes[randomIndex];
                nearbyNodes.splice(randomIndex, 1);
                links.push({
                    source: node.id,
                    target: targetNode.id
                });
            }
        }
    });

    links = links.filter((link, index, self) =>
        link.source !== link.target &&
        index === self.findIndex((l) => (
            (l.source === link.source && l.target === link.target) ||
            (l.source === link.target && l.target === link.source)
        ))
    );

    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links)
            .id(d => d.id)
            .distance(d => (maxDistance + minDistance) / 2)
            .strength(1))
        .force("charge", d3.forceManyBody()
            .strength(-100)
            .distanceMin(minDistance)
            .distanceMax(maxDistance))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide()
            .radius(d => d.radius * 1.5)
            .strength(1))
        .force("x", d3.forceX(width / 2).strength(d => d.centeringForce * 0.4))
        .force("y", d3.forceY(height / 2).strength(d => d.centeringForce * 0.4))
        .alphaDecay(0.05)
        .velocityDecay(0.6);

    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(links)
        .enter().append("path")
        .attr("fill", "none")
        .attr("stroke", "#161616")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", isDashedLines ? "5,5" : "none");

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

    simulation.on("tick", () => {
        const centerX = width / 2;
        const centerY = height / 2;

        nodes.forEach(node => {
            node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
            node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
        });

        link.attr("d", d => {
            const midX = (d.source.x + d.target.x) / 2;
            const midY = (d.source.y + d.target.y) / 2;
            const pullFactor = -0.2;
            const controlX = midX + (centerX - midX) * pullFactor;
            const controlY = midY + (centerY - midY) * pullFactor;
            return `M${d.source.x},${d.source.y} Q${controlX},${controlY} ${d.target.x},${d.target.y}`;
        });

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });
}

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

function updateSliderValue(sliderId, displayId) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    display.textContent = slider.value;
}

const debouncedGenerateNetwork = debounce(generateNetwork, 150);

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    sliders.forEach(({ sliderId, displayId }) => {
        updateSliderValue(sliderId, displayId);

        const slider = document.getElementById(sliderId);
        slider.addEventListener('input', () => {
            updateSliderValue(sliderId, displayId);
            debouncedGenerateNetwork();
        });
    });

    document.getElementById("dashedLinesCheck").addEventListener("change", (e) => {
        isDashedLines = e.target.checked;
        generateNetwork();
    });

    document.getElementById("exportBtn").onclick = function exportSVG() {
        const svgElement = document.getElementById("network");
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgElement);

        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "network.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    generateNetwork();
});

window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr("width", width).attr("height", height);
    if (simulation) {
        simulation.force("center", d3.forceCenter(width / 2, height / 2));
        simulation.alpha(0.3).restart();
    }
});
