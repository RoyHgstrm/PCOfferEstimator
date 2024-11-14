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
        const uniqueCPUs = {};
        data2.forEach(cpu => {
            const normalizedName = normalizeCPUName(cpu.name);
            const launchDate = launchDatesMap[normalizedName] || 'Unknown';
            const uniqueKey = `${cpu.name}-${cpu.core_count}-${cpu.core_clock}`;

            // Store unique CPUs in a map to avoid duplicates
            if (!uniqueCPUs[uniqueKey]) {
                uniqueCPUs[uniqueKey] = {
                    name: cpu.name,
                    launch_date: launchDate,
                    core_count: cpu.core_count,
                    core_clock: cpu.core_clock,
                    boost_clock: cpu.boost_clock,
                    price: cpu.price, // Using price directly from cpu2.json
                    tdp: cpu.tdp || 'N/A',
                    graphics: cpu.graphics || 'N/A',
                    smt: cpu.smt || false,
                    displayText: `${cpu.name} - ${cpu.price ? `$${cpu.price.toFixed(2)}` : 'Price not available'} 
                                  (${cpu.core_count} cores, ${cpu.core_clock} GHz base, 
                                  ${cpu.boost_clock} GHz boost, Launched: ${launchDate})`
                };
            }
        });

        const cpusWithLaunchDates = Object.values(uniqueCPUs);
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
function formatCPUOption({
    name,
    core_count = 0,
    core_clock = 0,
    boost_clock = 0,
    launch_date = 'Unknown',
    price = 'N/A'
}) {
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
            price_usd: gpu.count > 0 && gpu.price_usd > 0 ? parseFloat((gpu.price_usd / gpu.count).toFixed(2)) : null,
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
function formatCPUOption({
    name,
    core_count = 0,
    core_clock = 0,
    boost_clock = 0,
    launch_date = '2020-01-01'
}) {
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
        displayText: `${gpu.name}`
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
        console.log("Primary Storage Amount (GB):", storage);

        const storageType = document.getElementById('storageType').value || 'hdd';
        console.log("Primary Storage Type:", storageType);

        const secondaryStorage = parseFloat(document.getElementById('secondaryStorage').value) || 0;
        console.log("Secondary Storage Amount (GB):", secondaryStorage);

        const secondaryStorageType = document.getElementById('secondaryStorageType').value || 'none';
        console.log("Secondary Storage Type:", secondaryStorageType);

        const condition = document.getElementById('condition').value || 'used';
        console.log("Item Condition:", condition);

        // CPU price calculation using performance score, launch date, and average with launch price if available
        const calculateDepreciationFactor = (launchYear) => {
            const currentYear = new Date().getFullYear();
            const age = currentYear - launchYear;
            return age > 0 ? Math.max(0.2, 1 - age * 0.08) : 1; // 8% depreciation per year, minimum 50%
        };

        const cpuPerformanceScore = (cpuData.core_count * 12) + (cpuData.core_clock * 5) + (cpuData.boost_clock ? cpuData.boost_clock * 4 : 0);
        console.log("CPU Performance Score:", cpuPerformanceScore);

        let estimatedCpuPrice = cpuPerformanceScore * 2;
        console.log("Estimated CPU Price (based on performance):", estimatedCpuPrice);

        const launchCpuPrice = cpuData.price || null;
        console.log("Launch CPU Price:", launchCpuPrice);

        let ageDepreciationFactor = 1;
        if (cpuData.launch_date) {
            const launchYear = parseInt(cpuData.launch_date);
            if (!isNaN(launchYear)) {
                ageDepreciationFactor = calculateDepreciationFactor(launchYear);
                estimatedCpuPrice *= ageDepreciationFactor;
                console.log("Depreciated Estimated CPU Price:", estimatedCpuPrice);
            }
        }

        const cpuFinalPrice = launchCpuPrice ?
            (launchCpuPrice * ageDepreciationFactor + estimatedCpuPrice) / 2 :
            estimatedCpuPrice;
        console.log("Final CPU Price (average with launch price if available, with depreciation):", cpuFinalPrice);

        // GPU Calculation
        const gpuMemory = gpuData.memory || 0;
        console.log("GPU Memory (GB):", gpuMemory);

        const gpuCoreClock = gpuData.coreClock || 0;
        console.log("GPU Core Clock (MHz):", gpuCoreClock);

        const gpuBoostClock = gpuData.boostClock || 0;
        console.log("GPU Boost Clock (MHz):", gpuBoostClock);

        const gpuPriceBase = gpuData.price || 0;
        console.log("GPU Base Price:", gpuPriceBase);

        const gpuPerformanceScore = (gpuMemory * 0.18) + (gpuCoreClock * 0.030) + (gpuBoostClock * 0.045);
        console.log("Advanced GPU Performance Score:", gpuPerformanceScore);

        const realisticGpuPriceCap = Math.min(gpuPerformanceScore * 1.2 * 0.9, gpuPriceBase * 1.4);
        const gpuFinalPrice = (gpuPriceBase + realisticGpuPriceCap) / 2;
        console.log("Final GPU Price with Cap Adjustment:", gpuFinalPrice);

        // RAM Price Calculation
        const ramType = document.getElementById('ramType').value || 'DDR3';
        const ramTypeMultiplier = { 'DDR3': 0.6, 'DDR4': 1.0, 'DDR5': 1.3 }[ramType] || 1.0;
        const ramPrice = ram * 3 * ramTypeMultiplier;
        console.log("RAM Price (with type adjustment):", ramPrice);

        // Storage Price Calculations with Realistic Multipliers
        const storageMultiplier = storageType.toLowerCase() === "ssd" ? 0.09 : 0.03; // Adjusted multipliers based on recent SSD and HDD prices
        const storagePrice = storage * storageMultiplier;
        console.log("Primary Storage Price:", storagePrice);

        let secondaryStoragePrice = 0;
        if (secondaryStorageType !== 'none') {
            const secondaryStorageMultiplier = secondaryStorageType.toLowerCase() === "ssd" ? 0.09 : 0.03; // Secondary storage type multiplier based on recent data
            secondaryStoragePrice = secondaryStorage * secondaryStorageMultiplier;
            console.log("Secondary Storage Price:", secondaryStoragePrice);
        }

        // Total storage price
        const totalStoragePrice = storagePrice + secondaryStoragePrice;
        console.log("Total Storage Price:", totalStoragePrice);

        // Define more varied PSU multipliers based on wattage and certification level
        const psuWattageMultiplier = {
            300: 0.7, 
            400: 0.9, 
            500: 1.1, 
            600: 1.3, 
            700: 1.5, 
            750: 1.7, 
            850: 1.9, 
            1000: 2.1,
            1200: 2.5,
            1600: 3.0  // Higher multiplier for very high wattage PSUs
        };

        const psuCertificationMultiplier = {
            "80 Plus": 0.7,
            "80 Plus Bronze": 1.0,
            "80 Plus Silver": 1.3,
            "80 Plus Gold": 1.6,
            "80 Plus Platinum": 1.9,
            "80 Plus Titanium": 2.2  // Higher multiplier for Titanium-rated efficiency
        };

        // Retrieve the selected PSU value from the dropdown
        const psuSelection = document.getElementById('psu').value;
        console.log("PSU Selection:", psuSelection);

        // Check if the selection is "Unknown"
        let psuPrice = 0;
        if (psuSelection !== "Unknown") {
            // Extract wattage and certification level from the selected PSU option
            const [psuWattage, psuCertification] = psuSelection.split(" - ");
            const psuWattageValue = parseInt(psuWattage);
            const psuCertificationValue = psuCertification || "80 Plus"; // Default to "80 Plus" if undefined

            // Calculate PSU price based on wattage and certification level
            if (psuWattageValue && psuCertificationValue) {
                psuPrice = 40 * (psuWattageMultiplier[psuWattageValue] || 1.0) * (psuCertificationMultiplier[psuCertificationValue] || 1.0);
            }
        } else {
            console.log("PSU selection is 'Unknown'. Setting PSU price to 0.");
        }

        console.log("PSU Price:", psuPrice);



        // Total Base Price including PSU
        const basePrice = cpuFinalPrice + gpuFinalPrice + ramPrice + storagePrice + secondaryStoragePrice + psuPrice;
        console.log("Total Base Price:", basePrice);


        // Condition Multiplier and Transaction Type Multiplier
        const conditionMultiplier = { 'new': 1.0, 'like-new': 0.85, 'used': 0.75, 'worn': 0.5 }[condition] || 0.75;
        const transactionMultiplier = document.getElementById('buySellToggle').checked ? 1.1 : 0.9;
        console.log(`Transaction Multiplier (${document.getElementById('buySellToggle').checked ? 'sell' : 'buy'}):`, transactionMultiplier);

        const finalOffer = basePrice * conditionMultiplier * transactionMultiplier;
        console.log("Final Offer:", finalOffer);

        // Displaying the calculated offer
        document.getElementById('offerAmount').textContent = `${finalOffer.toFixed(2)} €`;
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