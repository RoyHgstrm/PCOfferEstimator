// Cache to store fetched data to avoid repeated fetch calls
const cache = {};

// Fetch and populate CPUs with caching and improved handling
async function fetchCPUs() {
    if (cache.cpus) return populateDropdown('cpu', cache.cpus);

    try {
        console.log("Fetching CPU data...");
        const response = await fetch('https://raw.githubusercontent.com/docyx/pc-part-dataset/main/data/json/cpu.json');
        const data = await response.json();
        cache.cpus = data; // Cache the data
        console.log("CPU data fetched:", data);
        populateDropdown('cpu', data, formatCPUOption);
    } catch (error) {
        console.error('Error fetching CPU data:', error);
    }
}

// Fetch and populate GPUs with caching and improved handling
async function fetchGPUs() {
    if (cache.gpus) return populateDropdown('gpu', cache.gpus);

    try {
        console.log("Fetching GPU data...");
        const response = await fetch('https://raw.githubusercontent.com/docyx/pc-part-dataset/main/data/json/video-card.json');
        const data = await response.json();

        // Filter GPUs to include only those with all required parameters and defined price
        const gpusWithAllParameters = data.filter(gpu => {
            return gpu.price !== null && gpu.price !== undefined &&
                   gpu.chipset !== null && gpu.chipset !== undefined &&
                   gpu.core_clock !== null && gpu.core_clock !== undefined &&
                   gpu.boost_clock !== null && gpu.boost_clock !== undefined &&
                   gpu.memory !== null && gpu.memory !== undefined;
        });

        cache.gpus = gpusWithAllParameters; // Cache the filtered data
        console.log("Filtered GPU data with all parameters:", gpusWithAllParameters);
        populateDropdown('gpu', cache.gpus, formatGPUOption);
    } catch (error) {
        console.error('Error fetching GPU data:', error);
    }
}



// Helper function to populate dropdowns with data
function populateDropdown(dropdownId, items, formatFunction) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = ''; // Clear existing options
    items.forEach(item => {
        const formattedItem = formatFunction(item);
        console.log(`Populating ${dropdownId} with item:`, formattedItem);
        const option = document.createElement('option');
        option.value = JSON.stringify(formattedItem);
        option.textContent = formattedItem.displayText;
        dropdown.appendChild(option);
    });
}

// Format CPU options for the dropdown
function formatCPUOption({ name, core_count = 0, core_clock = 0, boost_clock = 0, launch_date = '2020-01-01' }) {
    return {
        name,
        core_count,
        core_clock,
        boost_clock,
        launch_date,
        displayText: `${name} (${core_count} cores, ${core_clock} GHz base)`
    };
}

// Format GPU options for the dropdown
function formatGPUOption({ name, price = 0, chipset, memory = 0, core_clock = 0, boost_clock = 0 }) {
    return {
        name,
        price: price || 0, // Set default price to 0 if price is null or undefined
        chipset,
        memory,
        core_clock,
        boost_clock,
        displayText: `${name} (${chipset}, ${memory}GB VRAM, ${core_clock} MHz core)`
    };
}

// Calculate depreciation based on launch date
function calculateDepreciation(launchDate) {
    const ageInYears = (new Date() - new Date(launchDate)) / (1000 * 60 * 60 * 24 * 365);
    
    // Adjust depreciation rate for more aggressive depreciation
    const depreciation = Math.max(0.2, 1 - (ageInYears * 0.1)); // 20% depreciation per year
    
    console.log(`Calculated depreciation for ${launchDate}:`, depreciation);
    return depreciation;
}


// Calculate and display the estimated offer
function calculateOffer() {
    try {
        console.log("Starting offer calculation...");
        const cpuData = JSON.parse(document.getElementById('cpu').value);
        const gpuData = JSON.parse(document.getElementById('gpu').value);
        const ram = parseFloat(document.getElementById('ram').value) || 0;
        const storage = parseFloat(document.getElementById('storage').value) || 0;
        const storageType = document.getElementById('storageType').value;
        const condition = document.getElementById('condition').value;

        console.log("CPU Data:", cpuData);
        console.log("GPU Data:", gpuData);

        // CPU price calculation with performance score, depreciation, and base multiplier
        const cpuPerformanceScore = (cpuData.core_count * 10) + (cpuData.core_clock * 5) + (cpuData.boost_clock * 2);
        const cpuPrice = cpuPerformanceScore * calculateDepreciation(cpuData.launch_date) * 2;
        console.log("CPU Performance Score:", cpuPerformanceScore, "CPU Price:", cpuPrice);

        // Adjusted GPU performance score calculation to contribute 2/3 of the final price
        const gpuPerformanceScore = (gpuData.memory * 0.15) + (gpuData.core_clock * 0.08) + (gpuData.boost_clock * 0.09);
        const depreciationFactor = calculateDepreciation(gpuData.launch_date || '2020-01-01');

        // Calculate the adjusted GPU price based on the performance score with depreciation
        const calculatedGpuPrice = gpuPerformanceScore * depreciationFactor * 1.5; // Adjusted multiplier for 2/3 weight

        // Final GPU price with 2/3 based on calculated performance and 1/3 based on the provided price (if available)
        const gpuPrice = gpuData.price
            ? ((3 / 4) * calculatedGpuPrice + (1 / 4) * (gpuData.price * depreciationFactor))
            : calculatedGpuPrice;

        console.log("GPU Performance Score:", gpuPerformanceScore, "Calculated GPU Price:", calculatedGpuPrice, "Final GPU Price:", gpuPrice);

        // RAM price based on 4 € per GB as a baseline
        const ramPrice = ram * 2;
        console.log("RAM Price:", ramPrice);

        // Storage pricing with SSD premium multiplier
        const storageMultiplier = storageType === "ssd" ? 0.1 : 0.05;
        const storagePrice = storage * storageMultiplier;
        console.log("Storage Price:", storagePrice);

        // Calculate the base price from all components
        const basePrice = cpuPrice + gpuPrice + ramPrice + storagePrice;
        console.log("Base Price:", basePrice);

        // Apply condition multiplier with realistic values
        const conditionMultiplier = {
            'new': 0.95,
            'like-new': 0.85,
            'used': 0.7,
            'worn': 0.5
        }[condition] || 0.7;
        
        const offer = basePrice * conditionMultiplier;
        console.log("Condition Multiplier:", conditionMultiplier, "Final Offer:", offer);

        // Display the offer result
        document.getElementById('offerAmount').textContent = `${offer.toFixed(2)} €`;
        document.getElementById('offerResult').classList.remove('hidden');
    } catch (error) {
        console.error("Error calculating offer:", error);
        alert("Please ensure all fields are selected properly.");
    }
}

// Initialize and load data on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchCPUs();
    fetchGPUs();
});
