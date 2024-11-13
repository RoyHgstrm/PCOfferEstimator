// Cache to store fetched data to avoid repeated fetch calls
const cache = {};

// Fetch and populate CPUs with caching, focusing on cpu2.json and pulling only launch dates from cpu.json
async function fetchCPUs() {
    if (cache.cpus) return populateDropdown('cpu', cache.cpus);

    try {
        // Fetch both JSON files
        const response2 = await fetch('./js/cpu2.json');
        const response1 = await fetch('./js/cpu.json');

        const data2 = await response2.json(); // Data from cpu2.json (primary data with prices and models)
        const data1 = await response1.json(); // Data from cpu.json (for launch dates only)

        // Create a map of CPU names to launch dates from cpu.json
        const launchDatesMap = {};
        data1.forEach(cpu => {
            const normalizedName = normalizeCPUName(cpu.name);
            launchDatesMap[normalizedName] = cpu.launch_date;
        });

        // Use data from cpu2.json directly, adding launch dates from cpu.json if available
        const cpusWithLaunchDates = data2.map(cpu => {
            const normalizedName = normalizeCPUName(cpu.name);
            const launchDate = launchDatesMap[normalizedName] || 'Unknown';

            return {
                name: cpu.name,
                launch_date: launchDate,
                core_count: cpu.core_count,
                core_clock: cpu.core_clock,
                boost_clock: cpu.boost_clock,
                price: cpu.price,  // Using price directly from cpu2.json
                tdp: cpu.tdp || 'N/A',
                graphics: cpu.graphics || 'N/A',
                smt: cpu.smt || false,
                displayText: `${cpu.name} - ${cpu.price ? `$${cpu.price.toFixed(2)}` : 'Price not available'} 
                              (${cpu.core_count} cores, ${cpu.core_clock} GHz base, 
                              ${cpu.boost_clock} GHz boost, Launched: ${launchDate})`
            };
        });

        console.log("CPUs with launch dates and prices:", cpusWithLaunchDates);

        // Cache the data and populate the dropdown
        cache.cpus = cpusWithLaunchDates;
        populateDropdown('cpu', cache.cpus, formatCPUOption);
    } catch (error) {
        console.error('Error fetching CPU data:', error);
    }
}

// Helper function to normalize CPU names by removing common prefixes, series indicators, and variants
function normalizeCPUName(name) {
    if (!name) return '';

    const prefixRegex = /^(Intel Core|Intel|AMD Ryzen|AMD)\s+/i;
    const normalizedName = name.replace(prefixRegex, '').trim();

    console.log(`Normalized CPU name for "${name}": ${normalizedName}`);
    return normalizedName;
}

// Format CPU options for the dropdown, displaying name, price, core count, clock speeds, and launch date
function formatCPUOption({ name, core_count = 0, core_clock = 0, boost_clock = 0, launch_date = 'Unknown', price = 'N/A' }) {
    return {
        name,
        core_count,
        core_clock,
        boost_clock,
        launch_date,
        price,
        displayText: `${name} - ${price !== 'N/A' ? `$${price.toFixed(2)}` : 'Price not available'} 
                      (${core_count} cores, ${core_clock} GHz base, ${boost_clock} GHz boost, Launched: ${launch_date})`
    };
}

// Populate dropdown with data
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























// Fetch and populate GPUs with caching, improved handling, and cross-referencing with another JSON
async function fetchGPUs() {
    if (cache.gpus) {
        return populateDropdown('gpu', cache.gpus);
    }

    try {
        const response1 = await fetch('./js/video-card.json');
        const response2 = await fetch('./js/gpu.json');

        const data1 = await response1.json();
        const data2 = await response2.json();

        const gpuLaunchDates = {};

        data2.forEach(series => {
            series.models.forEach(gpu => {
                const normalizedName = normalizeGPUName(gpu.name);
                gpuLaunchDates[`${normalizedName}-${gpu.memory_gb}`] = gpu.launch_date;
            });
        });

        const groupedGPUs = {};

        data1.forEach(gpu => {
            const normalizedGPUName = normalizeGPUName(gpu.name);
            const memoryKey = `${normalizedGPUName}-${gpu.memory_gb}`;

            const launchDate = gpuLaunchDates[memoryKey];
            if (!launchDate) return;

            if (!groupedGPUs[memoryKey]) {
                groupedGPUs[memoryKey] = {
                    name: gpu.name,
                    price_usd: 0,
                    core_clock_mhz: 0,
                    boost_clock_mhz: 0,
                    memory_gb: gpu.memory_gb,
                    count: 0,
                    launch_date: launchDate,
                    brand: gpu.brand || "",
                    color: gpu.color || "",
                    length: gpu.length || 0
                };
            }

            if (gpu.price_usd) groupedGPUs[memoryKey].price_usd += gpu.price_usd;
            if (gpu.core_clock_mhz) groupedGPUs[memoryKey].core_clock_mhz += gpu.core_clock_mhz;
            if (gpu.boost_clock_mhz) groupedGPUs[memoryKey].boost_clock_mhz += gpu.boost_clock_mhz;
            groupedGPUs[memoryKey].count += 1;
        });

        const averagedGPUs = Object.values(groupedGPUs).map(gpu => ({
            name: gpu.name,
            price_usd: gpu.count > 0 ? parseFloat((gpu.price_usd / gpu.count).toFixed(2)) : 0,
            core_clock_mhz: gpu.count > 0 ? parseFloat((gpu.core_clock_mhz / gpu.count).toFixed(2)) : 0,
            boost_clock_mhz: gpu.count > 0 ? parseFloat((gpu.boost_clock_mhz / gpu.count).toFixed(2)) : 0,
            memory_gb: gpu.memory_gb,
            launch_date: gpu.launch_date,
            brand: gpu.brand,
            color: gpu.color,
            length: gpu.length
        }));

        cache.gpus = averagedGPUs;
        populateDropdown('gpu', cache.gpus, formatGPUOption);
    } catch (error) {
        console.error('Error fetching GPU data:', error);
    }
}

// Helper function to normalize GPU names by removing common prefixes and irrelevant words
function normalizeGPUName(name) {
    if (!name) return '';

    const brandPrefixes = /^(Radeon|GeForce|NVIDIA|AMD|EVGA|ASUS|MSI|Gigabyte|Zotac)\s*/i;
    const seriesPrefixes = /\b(GTX|RTX|Quadro|Titan|GT|MX)\b/i;
    const variants = /\b(Super|Ti|OC|Gaming|Edition|Turbo|Dual|WindForce|Rising|Pro|LHR)\b/i;
    const memorySizes = /\s*\d+GB\s*/i;

    let normalizedName = name
        .replace(brandPrefixes, '')
        .replace(seriesPrefixes, '')
        .replace(variants, '')
        .replace(memorySizes, '')
        .replace(/\s+/g, ' ')
        .trim();

    return normalizedName;
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

function calculateDepreciation(launchDate) {
    if (!launchDate || launchDate === "Unknown") {
        console.log("No launch date available; using default depreciation factor.");
        return 0.5; // Default depreciation for unknown dates (or choose a rate based on average age)
    }

    let date;
    if (/^\d{4}$/.test(launchDate)) {
        date = new Date(`${launchDate}-01-01`);
    } else {
        date = new Date(launchDate);
    }

    const ageInYears = (new Date() - date) / (1000 * 60 * 60 * 24 * 365);
    const depreciation = Math.max(0.2, 1 - (ageInYears * 0.2));
    console.log(`Calculated depreciation for ${launchDate}:`, depreciation);
    return depreciation;
}



function calculateOffer() {
    try {
        console.log("Starting offer calculation...");

        // Retrieve and parse values from selected options
        const cpuData = JSON.parse(document.getElementById('cpu').value);
        console.log("Selected CPU Data:", cpuData);

        const gpuData = JSON.parse(document.getElementById('gpu').value);
        console.log("Selected GPU Data:", gpuData);

        const ram = parseFloat(document.getElementById('ram').value) || 0;
        console.log("RAM Amount (GB):", ram);

        const storage = parseFloat(document.getElementById('storage').value) || 0;
        console.log("Storage Amount (GB):", storage);

        const storageType = document.getElementById('storageType').value || 'hdd';
        console.log("Storage Type:", storageType);

        const condition = document.getElementById('condition').value || 'used';
        console.log("Item Condition:", condition);

        // CPU price calculation using performance score and average with launch price if available
        const cpuPerformanceScore = (cpuData.core_count * 12) + (cpuData.core_clock * 5) + (cpuData.boost_clock * 4);
        console.log("CPU Performance Score:", cpuPerformanceScore);

        const estimatedCpuPrice = cpuPerformanceScore * 2;
        console.log("Estimated CPU Price:", estimatedCpuPrice);

        // Average with launch price if available
        const launchCpuPrice = cpuData.price || null;
        console.log("Launch CPU Price:", launchCpuPrice);

        const cpuFinalPrice = launchCpuPrice
            ? (launchCpuPrice + estimatedCpuPrice) / 2
            : estimatedCpuPrice;
        console.log("Final CPU Price (average with launch price if available):", cpuFinalPrice);

        // GPU Calculation
        const gpuMemory = gpuData.memory || 0;
        console.log("GPU Memory (GB):", gpuMemory);

        const gpuCoreClock = gpuData.coreClock || 0;
        console.log("GPU Core Clock (MHz):", gpuCoreClock);

        const gpuBoostClock = gpuData.boostClock || 0;
        console.log("GPU Boost Clock (MHz):", gpuBoostClock);

        const gpuPriceBase = gpuData.price || 0;
        console.log("GPU Base Price:", gpuPriceBase);

        const gpuPerformanceScore = (gpuMemory * 0.15) + (gpuCoreClock * 0.08) + (gpuBoostClock * 0.09);
        console.log("GPU Performance Score:", gpuPerformanceScore);

        const calculatedGpuPrice = gpuPerformanceScore * 1.5;
        console.log("Calculated GPU Price (based on performance):", calculatedGpuPrice);

        const gpuFinalPrice = gpuPriceBase > calculatedGpuPrice
            ? calculatedGpuPrice
            : gpuPriceBase;
        console.log("Final GPU Price:", gpuFinalPrice);

        // RAM and Storage Calculations
        const ramPrice = ram * 3;
        console.log("RAM Price:", ramPrice);

        const storageMultiplier = storageType.toLowerCase() === "ssd" ? 0.10 : 0.04;
        console.log("Storage Price Multiplier (based on type):", storageMultiplier);

        const storagePrice = storage * storageMultiplier;
        console.log("Storage Price:", storagePrice);

        // Total Base Price
        const basePrice = cpuFinalPrice + gpuFinalPrice + ramPrice + storagePrice;
        console.log("Total Base Price:", basePrice);

        // Advanced Condition Multiplier Calculation
        let conditionMultiplier = 0.6; // Default fallback for unknown conditions

        const conditionLevels = {
            'new': { base: 0.95, ageAdjustment: 0, wearAdjustment: 0 },
            'like-new': { base: 0.8, ageAdjustment: -0.03, wearAdjustment: -0.02 },
            'used': { base: 0.6, ageAdjustment: -0.04, wearAdjustment: -0.03 },
            'worn': { base: 0.4, ageAdjustment: -0.06, wearAdjustment: -0.04 }
        };

        // Define age and wear level as factors for adjustments
        const ageBracket = 3; // Estimated number of years old (example)
        const wearLevel = 2; // Wear level from 1 to 5, where 5 is most worn

        const conditionData = conditionLevels[condition.toLowerCase()] || conditionLevels['used'];

        // Calculate age and wear adjustments
        const ageAdjustment = conditionData.ageAdjustment * Math.min(ageBracket, 5); // Cap adjustments to max 5 years
        const wearAdjustment = conditionData.wearAdjustment * Math.min(wearLevel, 5); // Cap wear adjustment to scale

        // Final multiplier with minimum bound to avoid extreme low values
        conditionMultiplier = Math.max(
            0.25, // Minimum multiplier
            conditionData.base + ageAdjustment + wearAdjustment
        );

        console.log("Condition Multiplier (Advanced):", conditionMultiplier);



        // Final Offer Calculation
        const offer = basePrice * conditionMultiplier;
        console.log("Final Offer:", offer);

        // Displaying the calculated offer
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
