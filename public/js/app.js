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
        const response = await fetch('./js/gpu.json');
        const data = await response.json();

        // Filter GPUs to include only those with all required parameters and defined price
        const gpusWithAllParameters = data
            .flatMap(series => series.models) // Extract all models from each series
            .filter(gpu => {
                // Use release_year to construct launch_date if it's missing
                if (!gpu.launch_date && gpu.release_year) {
                    gpu.launch_date = `${gpu.release_year}-01-01`; // Default to January 1st of the release year
                }

                // Check for all required parameters after setting a default launch_date if needed
                const hasAllParameters = gpu.price_usd !== null && gpu.price_usd !== undefined &&
                                         gpu.name !== null && gpu.name !== undefined &&
                                         gpu.core_clock_mhz !== null && gpu.core_clock_mhz !== undefined &&
                                         gpu.boost_clock_mhz !== null && gpu.boost_clock_mhz !== undefined &&
                                         gpu.memory_gb !== null && gpu.memory_gb !== undefined &&
                                         gpu.launch_date !== null && gpu.launch_date !== undefined;

                if (!hasAllParameters) {
                    console.warn("GPU skipped due to missing parameters:", gpu);
                }

                return hasAllParameters;
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

// Helper function to format GPU data for dropdown display
function formatGPUOption(gpu) {
    const formattedOption = {
        name: gpu.name,
        coreClock: gpu.core_clock_mhz,
        boostClock: gpu.boost_clock_mhz,
        memory: gpu.memory_gb,
        price: gpu.price_usd,
        launchDate: gpu.launch_date,
        displayText: `${gpu.name} (${gpu.memory_gb}GB, ${gpu.core_clock_mhz} MHz Core, ${gpu.boost_clock_mhz} MHz Boost, Launched: ${gpu.launch_date}, $${gpu.price_usd})`
    };
    console.log("Formatted GPU option:", formattedOption);
    return formattedOption;
}

// Calculate depreciation based on launch date or just the year
function calculateDepreciation(launchDate) {
    let date;

    // Check if launchDate is only a year
    if (/^\d{4}$/.test(launchDate)) {
        date = new Date(`${launchDate}-01-01`); // Convert year to January 1st of that year
    } else {
        date = new Date(launchDate);
    }

    // Calculate the age in years
    const ageInYears = (new Date() - date) / (1000 * 60 * 60 * 24 * 365);

    // Adjust depreciation rate for more aggressive depreciation
    const depreciation = Math.max(0.2, 1 - (ageInYears * 0.2)); // 20% depreciation per year

    console.log(`Calculated depreciation for ${launchDate}:`, depreciation);
    return depreciation;
}

// Calculate and display the estimated offer
function calculateOffer() {
    try {
        console.log("Starting offer calculation...");

        // Retrieve values and parse JSON data from selected options
        const cpuData = JSON.parse(document.getElementById('cpu').value);
        const gpuData = JSON.parse(document.getElementById('gpu').value);
        const ram = parseFloat(document.getElementById('ram').value) || 0;
        const storage = parseFloat(document.getElementById('storage').value) || 0;
        const storageType = document.getElementById('storageType').value;
        const condition = document.getElementById('condition').value;

        console.log("CPU Data:", cpuData);
        console.log("GPU Data:", gpuData);

        // CPU price calculation with performance score, depreciation, and base multiplier
        const cpuPerformanceScore = (cpuData.core_count * 12) + (cpuData.core_clock * 5) + (cpuData.boost_clock * 4);
        const cpuPrice = cpuPerformanceScore * calculateDepreciation(cpuData.launch_date) * 2;
        console.log("CPU Performance Score:", cpuPerformanceScore, "CPU Price:", cpuPrice);

        // Verify and set GPU properties with fallback values if they are missing or invalid
        const gpuMemory = gpuData.memory || 0;
        const gpuCoreClock = gpuData.coreClock || 0;
        const gpuBoostClock = gpuData.boostClock || 0;
        const gpuPriceBase = gpuData.price || 0;

        console.log("GPU Memory:", gpuMemory, "GPU Core Clock:", gpuCoreClock, "GPU Boost Clock:", gpuBoostClock, "GPU Base Price:", gpuPriceBase);

        // Adjusted GPU performance score calculation to contribute 2/3 of the final price
        const gpuPerformanceScore = (gpuMemory * 0.15) + (gpuCoreClock * 0.08) + (gpuBoostClock * 0.09);
        const depreciationFactor = calculateDepreciation(gpuData.launchDate);

        const calculatedGpuPrice = gpuPerformanceScore * depreciationFactor * 1.5;

        const gpuPrice = gpuPriceBase
            ? ((2 / 3) * calculatedGpuPrice + (1 / 3) * (gpuPriceBase * depreciationFactor))
            : calculatedGpuPrice;

        console.log("GPU Performance Score:", gpuPerformanceScore, "Calculated GPU Price:", calculatedGpuPrice, "Final GPU Price:", gpuPrice);

        const ramPrice = ram * 4;
        console.log("RAM Price:", ramPrice);

        const storageMultiplier = storageType === "ssd" ? 0.10 : 0.04;
        const storagePrice = storage * storageMultiplier;
        console.log("Storage Price:", storagePrice);

        const basePrice = cpuPrice + gpuPrice + ramPrice + storagePrice;
        console.log("Base Price:", basePrice);

        const conditionMultiplier = {
            'new': 1.1,
            'like-new': 0.85,
            'used': 0.7,
            'worn': 0.5
        }[condition] || 0.7;

        const offer = basePrice * conditionMultiplier;
        console.log("Condition Multiplier:", conditionMultiplier, "Final Offer:", offer);

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
