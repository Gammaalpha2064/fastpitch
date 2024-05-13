// Constants for original and scaled dimensions
const baseWidth = 1280; // Original width of PowerPoint slide
const baseHeight = 720; // Original height of PowerPoint slide
const scaledWidth = (window.innerWidth/2)+20; // Width as displayed on the web
const scaledHeight = window.innerHeight*0.6; // Height as displayed on the web

// Calculate reverse scaling factors
const scaleX = baseWidth / scaledWidth;
const scaleY = baseHeight / scaledHeight;

// Function to adjust dimensions
function adjustDimensions(rect) {
    return {
        width: rect.width * scaleX,
        height: rect.height * scaleY,
        left: rect.left * scaleX,
        top: rect.top * scaleY
    };
}

// Function to gather data from an element based on tag type
function gatherElementData(elem) {
    const tagProcessors = {
        'IMG': processImageTag,
        'P': processTextTag,
        'H1': processTextTag,
        'SPAN': processTextTag, // Handling <span> tags
        'TABLE': processTableTag,
        'DIV': processDivElement, // Handle <div> tags through this processor
        // Add more tag-specific processors as needed
    };

    const tagName = elem.tagName.toUpperCase();
    if (tagProcessors[tagName]) {
        return tagProcessors[tagName](elem);
    }
}

// Main function to collect data for all slides
function collectPageData() {
    const presentationData = {
        presentation: {
            slides: []
        }
    };

    document.querySelectorAll('.slide').forEach((slideElem) => {
        const style = window.getComputedStyle(slideElem);
        const backgroundImage = style.backgroundImage;
        const rect = slideElem.getBoundingClientRect();
        const adjustedRect = adjustDimensions(rect);

        const slide = {
            background: "white",
            backgroundImage: backgroundImage.slice(5, -2),
            width: adjustedRect.width,
            height: adjustedRect.height,
            contents: []
        };

        slideElem.querySelectorAll('*').forEach((elem) => {
            const elemData = gatherElementData(elem);
            if (elemData) {
                slide.contents.push(elemData);
            }
        });

        presentationData.presentation.slides.push(slide);
    });

    return presentationData;
}



function processHighchart(chart, x, y, width, height) {

    // Apply reverse scaling to the chart dimensions and position
    const adjustedSize = {width: width, height: height, left: x, top: y};


    // Initialize an array to hold x-axis categories or labels
    let xAxisCategories = [];

    // Check if xAxis categories are defined and extract them
    if (chart.options.xAxis && chart.options.xAxis.categories) {
        xAxisCategories = chart.options.xAxis.categories;
    } else if (chart.options.xAxis && Array.isArray(chart.options.xAxis) && chart.options.xAxis[0].categories) {
        // Handle cases where xAxis is an array and extract categories from the first xAxis object
        xAxisCategories = chart.options.xAxis[0].categories;
    }
    
    // Alternatively, for non-categorized axes, you might want to extract data from the series
    if (xAxisCategories.length === 0 && chart.series.length > 0) {
        // If no categories are found, attempt to gather labels from the first series' data points
        xAxisCategories = chart.series[0].data.map(dataPoint => dataPoint.name || dataPoint.x.toString());
    }

    // Extract necessary data from the Highcharts chart object
    const series = chart.series.map(s => ({
        color: s.color,
        name: s.name,
        data: s.data.map(point => ({
            x: point.x,
            y: point.y,
            name: point.name // For categorized data
        }))
    }));

    // Preparing chart data JSON
    const chartData = {
        type: 'chart',
        tagName: 'chart',
        chartType: chart.options.chart.type,
        title: chart.options.title.text,
        xAxisCategories: xAxisCategories,
        series: series,
        xAxis: {
            labels: chart.options.xAxis[0].labels.style,
            lineColor: chart.options.xAxis[0].lineColor,
            tickColor: chart.options.xAxis[0].tickColor
        },
        yAxis: {
            title: chart.options.yAxis[0].title.text,
            labels: chart.options.yAxis[0].labels.style,
            lineColor: chart.options.yAxis[0].lineColor,
            tickColor: chart.options.yAxis[0].tickColor
        },
        legend: {
            itemStyle: chart.options.legend.itemStyle,
            itemHoverStyle: chart.options.legend.itemHoverStyle,
            itemHiddenStyle: chart.options.legend.itemHiddenStyle
        },
        position: { x: adjustedSize.left, y: adjustedSize.top }, // Adjusted position
        size: { width: adjustedSize.width, height: adjustedSize.height } // Adjusted size
    };

    // Return the structured chart data
    return chartData;
}



function processChartTag(elem) {
    const boundingRect = elem.getBoundingClientRect();
    const adjustedRect = adjustDimensions(boundingRect);  // Apply scaling correction

    const slideContainer = elem.closest('.slide');
    const slideBoundingRect = slideContainer.getBoundingClientRect();
    const adjustedSlideRect = adjustDimensions(slideBoundingRect);

    // Adjust positions to be relative to the adjusted slide container
    const relativeX = adjustedRect.left - adjustedSlideRect.left;
    const relativeY = adjustedRect.top - adjustedSlideRect.top;

    // Attempt to retrieve the chart configuration
    const chartConfig = elem.chartConfig || {};  // Adjust based on how you stored it

    return {
        type: 'chart',
        tagName: elem.tagName.toLowerCase(),
        chartType: chartConfig.chart?.type,
        title: chartConfig.title?.text,
        xAxis: {
            categories: chartConfig.xAxis?.categories,
            labels: chartConfig.xAxis?.labels?.style
        },
        yAxis: {
            title: chartConfig.yAxis?.title?.text,
            labels: chartConfig.yAxis?.labels?.style
        },
        series: chartConfig.series?.map(series => ({
            name: series.name,
            data: series.data.map(point => ({
                x: point.x,
                y: point.y,
                name: point.name || ''  // Ensure name is processed even if not set
            })),
            color: series.color
        })),
        position: { x: relativeX, y: relativeY },
        size: { width: adjustedRect.width, height: adjustedRect.height }
    };
}




function processDivElement(elem) {
    const computedStyle = window.getComputedStyle(elem);
    const boundingRect = elem.getBoundingClientRect();
    const adjustedRect = adjustDimensions(boundingRect);

    // Find the closest slide container
    const slideContainer = elem.closest('.slide');
    const slideBoundingRect = slideContainer.getBoundingClientRect();
    const adjustedSlideRect = adjustDimensions(slideBoundingRect);

    // Adjust positions to be relative to the adjusted slide container
    const relativeX = adjustedRect.left - adjustedSlideRect.left;
    const relativeY = adjustedRect.top - adjustedSlideRect.top;

    // Check if this div is a Highcharts container
    if (elem.id && Highcharts.charts) {
        const chart = Highcharts.charts.find(chart => chart.renderTo.id === elem.id);
        if (chart) {
            // This div is a Highcharts container, process it as a chart
            return processHighchart(chart, relativeX, relativeY, adjustedRect.width, adjustedRect.height);
        }
    }

    // If not a Highcharts container or no Highcharts found, process as a normal div
    const hasOnlyTextContent = elem.childNodes.length === 1 && elem.childNodes[0].nodeType === Node.TEXT_NODE;
    if (hasOnlyTextContent) {
        // The div is effectively a text container
        return {
            type: 'text',
            tagName: 'div',
            text: elem.textContent.trim(),
            styles: {
                color: computedStyle.color,
                fontSize: computedStyle.fontSize,
                fontWeight: computedStyle.fontWeight,
                fontStyle: computedStyle.fontStyle,
                textDecoration: computedStyle.textDecoration,
                textAlign: computedStyle.textAlign,
            },
            position: { x: relativeX, y: relativeY },
            size: { width: adjustedRect.width, height: adjustedRect.height }
        };
    } else {
        // Process as a generic container if it has children but is not specifically handled
        return {
            type: 'container',
            tagName: 'div',
            position: { x: relativeX, y: relativeY },
            size: { width: adjustedRect.width, height: adjustedRect.height }
        };
    }
}


function processImageTag(elem) {
    const boundingRect = elem.getBoundingClientRect();
    const adjustedRect = adjustDimensions(boundingRect); // Apply scaling correction

    // Find the closest slide container
    const slideContainer = elem.closest('.slide');
    const slideBoundingRect = slideContainer.getBoundingClientRect();
    const adjustedSlideRect = adjustDimensions(slideBoundingRect);

    // Adjust positions to be relative to the adjusted slide container
    const relativeX = adjustedRect.left - adjustedSlideRect.left;
    const relativeY = adjustedRect.top - adjustedSlideRect.top;

    return {
        type: 'image',
        tagName: elem.tagName.toLowerCase(),
        src: elem.src,
        position: { x: relativeX, y: relativeY },
        size: { width: adjustedRect.width, height: adjustedRect.height }
    };
}

function processTextTag(elem) {
    const computedStyle = window.getComputedStyle(elem);
    const boundingRect = elem.getBoundingClientRect();
    const adjustedRect = adjustDimensions(boundingRect);

    const slideContainer = elem.closest('.slide');
    const slideBoundingRect = slideContainer.getBoundingClientRect();
    const adjustedSlideRect = adjustDimensions(slideBoundingRect);

    const relativeX = adjustedRect.left - adjustedSlideRect.left;
    const relativeY = adjustedRect.top - adjustedSlideRect.top;

    return {
        type: 'text',
        tagName: elem.tagName.toLowerCase(),
        text: elem.innerText,
        tagName: elem.tagName.toLowerCase(),
        position: { x: relativeX, y: relativeY },
        size: { width: adjustedRect.width, height: adjustedRect.height },
        styles: {
            color: computedStyle.color,
            fontSize: computedStyle.fontSize,
            fontWeight: computedStyle.fontWeight,
            fontStyle: computedStyle.fontStyle,
            textDecoration: computedStyle.textDecoration,
            textAlign: computedStyle.textAlign
        }
    };
}




function processTableTag(tableElem) {
    const boundingRect = tableElem.getBoundingClientRect();
    const adjustedRect = adjustDimensions(boundingRect);

    const slideContainer = tableElem.closest('.slide');
    const slideBoundingRect = slideContainer.getBoundingClientRect();
    const adjustedSlideRect = adjustDimensions(slideBoundingRect);

    const relativeX = adjustedRect.left - adjustedSlideRect.left;
    const relativeY = adjustedRect.top - adjustedSlideRect.top;

    let tableData = {
        type: 'table',
        tagName: tableElem.tagName.toLowerCase(),
        position: { x: relativeX, y: relativeY },
        size: { width: adjustedRect.width, height: adjustedRect.height },
        rows: [],
        columnWidths: []
    };

    Array.from(tableElem.rows).forEach((rowElem) => {
        let rowData = { cells: [] };
        Array.from(rowElem.cells).forEach((cell) => {
            const cellStyle = window.getComputedStyle(cell);
            let cellData = {
                text: cell.innerText.trim(),
                tagName: rowElem.tagName.toLowerCase(),
                style: {
                    color: cellStyle.color,
                    backgroundColor: cellStyle.backgroundColor,
                    fontSize: cellStyle.fontSize,
                    fontWeight: cellStyle.fontWeight,
                    fontStyle: cellStyle.fontStyle,
                    textDecoration: cellStyle.textDecoration,
                    textAlign: cellStyle.textAlign,
                    borderTop: `${cellStyle.borderTopWidth} ${cellStyle.borderTopStyle} ${cellStyle.borderTopColor}`,
                    borderBottom: `${cellStyle.borderBottomWidth} ${cellStyle.borderBottomStyle} ${cellStyle.borderBottomColor}`,
                    borderLeft: `${cellStyle.borderLeftWidth} ${cellStyle.borderLeftStyle} ${cellStyle.borderLeftColor}`,
                    borderRight: `${cellStyle.borderRightWidth} ${cellStyle.borderRightStyle} ${cellStyle.borderRightColor}`
                }
            };
            rowData.cells.push(cellData);
        });
        tableData.rows.push(rowData);
    });

    if (tableElem.rows.length > 0) {
        Array.from(tableElem.rows[0].cells).forEach(cell => {
            tableData.columnWidths.push(cell.offsetWidth * scaleX);
        });
    }

    return tableData;
}






