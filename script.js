let nodes = [],
    links = [];
let width = window.innerWidth;
let height = window.innerHeight;
let centralNodeSize = 50;
let imageCount = 0;
let imageFiles = [];
let isDashed = false;
let isPolygonDistribution = true;

const svg = d3
    .select("#network")
    .attr("width", width)
    .attr("height", height);

const defs = svg.append("defs");

const sliders = [
    { sliderId: "nodeCount", displayId: "nodeCountValue" },
    { sliderId: "minNodeRadius", displayId: "minNodeRadiusValue" },
    { sliderId: "maxNodeRadius", displayId: "maxNodeRadiusValue" },
    { sliderId: "centralNodeSize", displayId: "centralNodeSizeValue" },
    { sliderId: "minDistance", displayId: "minDistanceValue" },
    { sliderId: "maxDistance", displayId: "maxDistanceValue" },
    { sliderId: "polygonEdges", displayId: "polygonEdgesValue" }
];

function generateRandomPosition(centerX, centerY, minDistance, maxDistance) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    return {
        x: centerX + distance * Math.cos(angle),
        y: centerY + distance * Math.sin(angle)
    };
}

function calculatePolygonPoints(centerX, centerY, radius, sides) {
    const points = [];
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push({ x, y });
    }
    return points;
}

function createImagePatterns(imageFiles) {
    console.log('Creating patterns for images:', imageFiles);
    defs.selectAll("*").remove();

    imageFiles.forEach((img, index) => {
        console.log(`Creating pattern for image: ${img}`);
        const pattern = defs.append("pattern")
            .attr("id", `image-pattern-${index}`)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("patternContentUnits", "objectBoundingBox")
            .append("image")
            .attr("href", `pics/${img}`)
            .attr("width", 1)
            .attr("height", 1)
            .attr("preserveAspectRatio", "xMidYMid slice");
    });
}

function generateNetwork() {
    svg.selectAll("*").remove();

    const minDistanceBase = +document.getElementById("minDistance").value;
    const maxDistanceBase = +document.getElementById("maxDistance").value;
    const nodeCount = +document.getElementById("nodeCount").value;
    const polygonEdges = +document.getElementById("polygonEdges").value;
    const minNodeRadius = +document.getElementById("minNodeRadius").value;
    const maxNodeRadius = +document.getElementById("maxNodeRadius").value;
    centralNodeSize = +document.getElementById("centralNodeSize").value;

    const distance = (minDistanceBase + maxDistanceBase) / 2 + centralNodeSize;

    nodes = [
        {
            id: 0,
            x: width / 2,
            y: height / 2,
            radius: centralNodeSize,
            isCentral: true,
        },
    ];

    if (isPolygonDistribution) {
        const polygonPoints = calculatePolygonPoints(width / 2, height / 2, distance, polygonEdges);
        
        for (let i = 0; i < nodeCount; i++) {
            const edgeIndex = Math.floor(i * polygonEdges / nodeCount);
            const nextEdgeIndex = (edgeIndex + 1) % polygonEdges;
            const progress = (i * polygonEdges / nodeCount) % 1;

            const startPoint = polygonPoints[edgeIndex];
            const endPoint = polygonPoints[nextEdgeIndex];
            
            let validPosition = false;
            let attempts = 0;
            let radius, x, y;

            while (!validPosition && attempts < 100) {
                radius = minNodeRadius + Math.random() * (maxNodeRadius - minNodeRadius);
                
                const adjustedProgress = progress + (Math.random() - 0.5) * 0.1;
                x = startPoint.x + (endPoint.x - startPoint.x) * adjustedProgress;
                y = startPoint.y + (endPoint.y - startPoint.y) * adjustedProgress;

                let hasOverlap = false;
                for (const node of nodes) {
                    const dx = x - node.x;
                    const dy = y - node.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < (radius + node.radius + 5)) {
                        hasOverlap = true;
                        break;
                    }
                }

                if (!hasOverlap) {
                    validPosition = true;
                }
                attempts++;
            }

            if (validPosition) {
                nodes.push({
                    id: i + 1,
                    x: x,
                    y: y,
                    radius: radius,
                    isCentral: false
                });
            }
        }
    } else {
        for (let i = 0; i < nodeCount; i++) {
            let validPosition = false;
            let attempts = 0;
            let radius, x, y;

            while (!validPosition && attempts < 100) {
                radius = minNodeRadius + Math.random() * (maxNodeRadius - minNodeRadius);
                const position = generateRandomPosition(width/2, height/2, minDistanceBase, maxDistanceBase);
                x = position.x;
                y = position.y;

                let hasOverlap = false;
                for (const node of nodes) {
                    const dx = x - node.x;
                    const dy = y - node.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < (radius + node.radius + 5)) {
                        hasOverlap = true;
                        break;
                    }
                }

                if (!hasOverlap) {
                    validPosition = true;
                }
                attempts++;
            }

            if (validPosition) {
                nodes.push({
                    id: i + 1,
                    x: x,
                    y: y,
                    radius: radius,
                    isCentral: false
                });
            }
        }
    }

    links = nodes.slice(1).map((node) => ({
        source: nodes[0],
        target: node,
    }));

    const link = svg
        .append("g")
        .selectAll("path")
        .data(links)
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", "#161616")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", isDashed ? "5,5" : "none")
        .attr("d", (d, i) => routeLink(d.source, d.target, i))
        .attr("stroke-linejoin", "round");

    const node = svg
        .append("g")
        .selectAll("g")
        .data(nodes)
        .enter()
        .append("g");

    node.append("circle")
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", (d) => d.radius)
        .attr("fill", (d) => d.isCentral ? "#FF9900" : "white")
        .attr("stroke", "#161616")
        .attr("stroke-width", 2);

    node.filter(d => !d.isCentral)
        .append("image")
        .attr("x", d => d.x - d.radius)
        .attr("y", d => d.y - d.radius)
        .attr("width", d => d.radius * 2)
        .attr("height", d => d.radius * 2)
        .attr("href", (d, i) => {
            const imagePath = `./pics/${imageFiles[((i) % imageCount + imageCount) % imageCount]}`;
            return imagePath;
        })
        .attr("clip-path", (d, i) => `circle(${d.radius}px at ${d.radius}px ${d.radius}px)`);
}

function routeLink(source, target, index) {
    const radius = 20;
    const midX = (source.x + target.x) / 2 + (Math.random() - 0.5) * 100;
    const midY = (source.y + target.y) / 2 + (Math.random() - 0.5) * 100;

    const points = [
        { x: source.x, y: source.y },
        { x: midX, y: source.y },
        { x: midX, y: midY },
        { x: target.x, y: midY },
        { x: target.x, y: target.y },
    ];

    return roundedLine(points, radius);
}

function roundedLine(points) {
    const line = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveBundle.beta(1));

    return line(points);
}

function updateSliderValue(sliderId, displayId) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    display.textContent = slider.value;
}

document.addEventListener("DOMContentLoaded", () => {
    imageFiles = ['1.jpeg', '2.jpeg', '3.jpeg', '4.jpeg', '5.jpeg', '6.jpeg', '7.jpeg', '8.jpeg', '9.jpeg', '10.jpeg', '11.jpeg',
        '12.jpeg', '13.jpeg', '14.jpeg', '15.jpeg', '16.jpeg', '17.jpeg', '18.jpeg', '19.jpeg', '20.jpeg', '21.jpeg', '22.jpeg', '23.jpeg', '24.jpeg'
    ];
    imageCount = imageFiles.length;
    generateNetwork();

    document.getElementById("dashToggleBtn").onclick = function() {
        isDashed = !isDashed;
        generateNetwork();
    };

    document.getElementById("distributionToggleBtn").onclick = function() {
        isPolygonDistribution = !isPolygonDistribution;
        this.textContent = isPolygonDistribution ? "Switch to Random" : "Switch to Polygon";
        generateNetwork();
    };

    sliders.forEach(({ sliderId, displayId }) => {
        updateSliderValue(sliderId, displayId);
        const slider = document.getElementById(sliderId);
        slider.addEventListener("input", () => {
            updateSliderValue(sliderId, displayId);
            generateNetwork();
        });
    });

    document.getElementById("exportBtn").onclick = exportSVG;
});

window.addEventListener("resize", () => {
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr("width", width).attr("height", height);
    generateNetwork();
});