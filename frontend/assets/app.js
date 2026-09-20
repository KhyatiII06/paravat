const API=window.PARVAT_API||"http://127.0.0.1:8000";
async function api(path,opt={}){const r=await fetch(API+path,opt);if(!r.ok)throw Error(r.status+": "+await r.text());return r.headers.get("content-type")?.includes("json")?r.json():r}
function toast(m){let e=document.querySelector(".toast");if(!e){e=document.createElement("div");e.className="toast";document.body.append(e)}e.textContent=m;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2600)}
async function health(){try{let d=await api("/api/health");document.querySelectorAll("[data-health]").forEach(e=>e.textContent=d.status?"ONLINE":"CHECK")}catch{document.querySelectorAll("[data-health]").forEach(e=>e.textContent="OFFLINE")}}

const regionNames={uttarakhand:"Uttarakhand",himachal:"Himachal Pradesh",nepal:"Nepal"};
function fmt(v,unit=""){return v===null||v===undefined||Number.isNaN(Number(v))?"—":`${Number(v).toFixed(0)}${unit}`}

function weatherCodeToText(code){

    const map = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Rime fog",
        51: "Light drizzle",
        53: "Drizzle",
        55: "Heavy drizzle",
        61: "Light rain",
        63: "Rain",
        65: "Heavy rain",
        71: "Light snowfall",
        73: "Snowfall",
        75: "Heavy snowfall",
        80: "Rain showers",
        81: "Heavy showers",
        82: "Violent showers",
        95: "Thunderstorm",
        96: "Thunderstorm + hail",
        99: "Severe thunderstorm"
    };

    return map[code] || "Mountain weather";
}


function weatherCodeToIcon(code){

    if(code === 0) return "☀";

    if([1,2].includes(code)) return "⛅";

    if([3,45,48].includes(code)) return "☁";

    if([51,53,55,61,63,65,80,81,82].includes(code))
        return "🌧";

    if([71,73,75].includes(code))
        return "❄";

    if([95,96,99].includes(code))
        return "⛈";

    return "•";
}

async function dashboard(){
    if(document.body.dataset.page !== "dashboard") return;

    health();

    const cards = document.getElementById("regionCards");
    const selected =
        new URLSearchParams(location.search).get("region") || "uttarakhand";

    const regionNames = {
        uttarakhand: "Uttarakhand",
        himachal: "Himachal Pradesh",
        nepal: "Nepal"
    };

    cards.innerHTML = Object.keys(regionNames).map(k => `
        <article class="region-live-card ${k === selected ? "selected" : ""}"
                 data-region="${k}">

            <div class="country">
                ${k === "nepal" ? "🇳🇵 NEPAL" : "🇮🇳 INDIA"}
                · HIMALAYAN REGION
            </div>

            <h3>${regionNames[k]}</h3>

            <div class="weather-main">
                <div class="temp" data-temp="${k}">--°</div>

                <div class="weather-meta">
                    <span data-condition="${k}">Loading...</span>
                    <span data-rain="${k}">Rain -- mm</span>
                </div>
            </div>

            <div class="forecast-strip" data-forecast="${k}">
                Loading forecast...
            </div>

            <div class="risk-pill" data-risk="${k}">
                ANALYZING
            </div>

            <div class="source-line" data-source="${k}">
                Connecting to weather intelligence...
            </div>
        </article>
    `).join("");

    let selectedData = null;

    for(const k of Object.keys(regionNames)){

        try{

            const d = await api(`/api/regions/${k}/weather`);

            const c = d.current || {};
            const r = d.risk || {};
            const hourly = d.hourly || {};

            /*
             * WEATHER
             */

            document.querySelector(`[data-temp="${k}"]`)
                .textContent =
                c.temperature_c != null
                    ? `${Math.round(c.temperature_c)}°C`
                    : "--";

            document.querySelector(`[data-rain="${k}"]`)
                .textContent =
                `Rain ${Number(c.rain_mm || 0).toFixed(1)} mm`;

            document.querySelector(`[data-condition="${k}"]`)
                .textContent =
                weatherCodeToText(c.weather_code);

            /*
             * HOURLY FORECAST
             */

            const forecast = document.querySelector(
                `[data-forecast="${k}"]`
            );

            const times = hourly.time || [];
            const rains = hourly.rain || [];
            const codes = hourly.weather_code || [];

            forecast.innerHTML = times
                .slice(0, 8)
                .map((time, i) => {

                    const date = new Date(time);

                    return `
                        <div class="forecast-hour">

                            <small>
                                ${date.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                })}
                            </small>

                            <strong>
                                ${weatherCodeToIcon(codes[i])}
                            </strong>

                            <span>
                                ${Number(rains[i] || 0).toFixed(1)}mm
                            </span>

                        </div>
                    `;

                })
                .join("");

            /*
             * RISK
             */

            const pill =
                document.querySelector(`[data-risk="${k}"]`);

            pill.textContent =
                `${r.band || "WATCH"} · ${r.score ?? "--"}`;

            pill.className =
                `risk-pill ${String(r.band || "")
                    .toLowerCase()}`;

            /*
             * SOURCE
             */

            document.querySelector(`[data-source="${k}"]`)
                .textContent =
                `${d.live ? "● LIVE" : "○ OFFLINE"} · Open-Meteo · ${
                    d.source_time || ""
                }`;

            if(k === selected){
                selectedData = d;
            }

        }catch(error){

            console.error("Weather error:", k, error);

            document.querySelector(
                `[data-source="${k}"]`
            ).textContent =
                "Weather service unavailable";
        }
    }

    /*
     * REGION CLICK
     */

    document
        .querySelectorAll(".region-live-card")
        .forEach(card => {

            card.onclick = () => {

                location.href =
                    `dashboard.html?region=${card.dataset.region}`;

            };

        });

    /*
     * SELECTED REGION
     */

    if(selectedData){

        document.getElementById("selectedRegionTitle")
            .textContent = selectedData.name;

        document.getElementById("selectedScore")
            .textContent =
            selectedData.risk?.score ?? "--";

        document.getElementById("selectedBand")
            .textContent =
            selectedData.risk?.band || "WATCH";

        document.getElementById("selectedGuidance")
            .textContent =
            selectedData.guidance || "";

        document.getElementById("drivers").innerHTML =
            (selectedData.risk?.drivers || [])
                .map(x => `<span class="driver">${x}</span>`)
                .join("");

        try{

            const a =
                await api(`/api/regions/${selected}/assets`);

            document.getElementById("assetStrip")
                .innerHTML =
                a.assets.map(x => `
                    <div class="asset-card">
                        <b>${x.kind.toUpperCase()}</b>
                        <span>${x.name}</span>
                        <small>
                            ${x.status} · ${x.note}
                        </small>
                    </div>
                `).join("");

        }catch(error){
            console.error(error);
        }
    }

    document.getElementById("weatherStatus")
        .textContent =
        "REGIONAL LIVE DATA";
}

function simulate(){

    if(document.body.dataset.page !== "simulate") return;

    health();

    const rain =
        document.getElementById("rainfall");

    const sev =
        document.getElementById("severity");

    const rainOut =
        document.getElementById("rainOut");

    const sevOut =
        document.getElementById("sevOut");

    const hazard =
        document.getElementById("hazard");

    const infra =
        document.getElementById("infra");

    const preview =
        document.getElementById("previewText");


    /*
     * ---------------------------------------------------------
     * LIVE PREVIEW
     * ---------------------------------------------------------
     */

    const update = () => {

        if(rain){
            rainOut.textContent =
                `${rain.value} mm`;
        }

        if(sev){
            sevOut.textContent =
                `${sev.value}%`;
        }

        if(preview && hazard && infra){

            const hazardName =
                hazard.options[
                    hazard.selectedIndex
                ].text.toLowerCase();

            const infrastructureName =
                infra.options[
                    infra.selectedIndex
                ].text
                .split(" · ")[0]
                .toLowerCase();


            preview.textContent =
                `A ${hazardName} begins to stress the ${infrastructureName} network. PARVAT will model the connected impact chain.`;

        }

    };


    [rain, sev, hazard, infra]
        .filter(Boolean)
        .forEach(element => {

            element.addEventListener(
                "input",
                update
            );

            element.addEventListener(
                "change",
                update
            );

        });


    update();


    /*
     * ---------------------------------------------------------
     * RUN SCENARIO
     * ---------------------------------------------------------
     */

    const run =
        document.getElementById("run");


    if(run){

        run.onclick = () => {

            const params =
                new URLSearchParams({

                    hazard:
                        hazard.value,

                    failed_node:
                        infra.value,

                    rainfall_mm:
                        rain.value,

                    severity:
                        (
                            Number(sev.value) / 100
                        ).toFixed(2)

                });


            window.location.href =
                `scenario.html?${params.toString()}`;

        };

    }

}



async function scenario(){

    if(document.body.dataset.page !== "scenario")
        return;


    health();


    /*
     * ---------------------------------------------------------
     * READ SCENARIO
     * ---------------------------------------------------------
     */

    const query =
        new URLSearchParams(
            window.location.search
        );


    const payload = {

        failed_node:
            query.get("failed_node")
            || "B01",

        rainfall_mm:
            Number(
                query.get("rainfall_mm")
                || 128
            ),

        severity:
            Number(
                query.get("severity")
                || 0.70
            ),

        hazard:
            query.get("hazard")
            || "landslide"

    };


    /*
     * ---------------------------------------------------------
     * NODE GRAPH
     * ---------------------------------------------------------
     */

    const nodes = {

        B01: {
            name: "Bridge",
            label: "Bridge B01"
        },

        R01: {
            name: "Road",
            label: "Road R01"
        },

        V01: {
            name: "Village",
            label: "Village V01"
        },

        H01: {
            name: "Hospital",
            label: "Hospital H01"
        },

        S01: {
            name: "Slope",
            label: "Slope S01"
        },

        W01: {
            name: "Water",
            label: "Water W01"
        },

        P01: {
            name: "Power",
            label: "Power P01"
        },

        C01: {
            name: "Communications",
            label: "Communications C01"
        }

    };


    /*
     * ---------------------------------------------------------
     * DIFFERENT CASCADE PATHS
     * ---------------------------------------------------------
     */

    const cascadePaths = {

        B01:
            ["B01", "R01", "V01", "C01", "H01"],

        R01:
            ["R01", "V01", "C01", "H01"],

        V01:
            ["V01", "C01", "H01"],

        H01:
            ["H01", "C01"],

        S01:
            ["S01", "R01", "V01", "C01", "H01"],

        W01:
            ["W01", "V01", "C01", "H01"],

        P01:
            ["P01", "C01", "V01", "H01"],

        C01:
            ["C01", "V01", "H01"]

    };


    const activePath =
        cascadePaths[payload.failed_node]
        || cascadePaths.B01;


    /*
     * ---------------------------------------------------------
     * HELPERS
     * ---------------------------------------------------------
     */

    const setText = (
        id,
        value
    ) => {

        const element =
            document.getElementById(id);

        if(element){

            element.textContent =
                value;

        }

    };


    /*
     * ---------------------------------------------------------
     * RESET VISUAL GRAPH
     * ---------------------------------------------------------
     */

    document
        .querySelectorAll(
            ".cascade-map .node"
        )
        .forEach(node => {

            node.classList.remove(
                "active",
                "danger",
                "warning",
                "affected"
            );

        });


    document
        .querySelectorAll(
            ".cascade-map .arrow"
        )
        .forEach(arrow => {

            arrow.classList.remove(
                "active"
            );

        });


    /*
     * ---------------------------------------------------------
     * LOADING STATE
     * ---------------------------------------------------------
     */

    setText(
        "scenarioTitle",
        "Running cascade analysis..."
    );


    setText(
        "scenarioSub",
        "PARVAT is tracing how the selected disruption propagates through connected infrastructure."
    );


    /*
     * ---------------------------------------------------------
     * BACKEND
     * ---------------------------------------------------------
     */

    try{

        const response =
            await api(
                "/api/simulate",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(payload)
                }
            );


        const cascade =
            Array.isArray(
                response.cascade
            )
                ? response.cascade
                : [];


        /*
         * -----------------------------------------------------
         * RISK
         * -----------------------------------------------------
         */

        const impacts =
            cascade
                .map(item =>
                    Number(item.impact)
                )
                .filter(
                    value =>
                        Number.isFinite(value)
                );


        const risk =
            impacts.length > 0

                ? Math.round(
                    Math.max(...impacts)
                )

                : Math.round(
                    Math.min(
                        100,
                        payload.severity * 100
                    )
                );


        const affectedCount =
            response.affected_count
            ?? activePath.length;


        /*
         * -----------------------------------------------------
         * HERO
         * -----------------------------------------------------
         */

        setText(
            "scenarioTitle",
            response.headline
            || "Cascade analysis complete"
        );


        setText(
            "scenarioSub",
            `${affectedCount} connected infrastructure nodes are inside this modeled impact chain.`
        );


        /*
         * -----------------------------------------------------
         * FACTS
         * -----------------------------------------------------
         */

        setText(
            "triggerNode",
            payload.failed_node
        );


        setText(
            "hazardOut",
            payload.hazard
                .replaceAll("_", " ")
                .toUpperCase()
        );


        setText(
            "rainOut",
            `${payload.rainfall_mm} mm`
        );


        setText(
            "affectedOut",
            affectedCount
        );


        /*
         * -----------------------------------------------------
         * RISK DISPLAY
         * -----------------------------------------------------
         */

        setText(
            "riskValue",
            risk
        );


        const meter =
            document.getElementById(
                "meterFill"
            );


        if(meter){

            meter.style.width =
                `${Math.min(100, risk)}%`;

        }


        /*
         * -----------------------------------------------------
         * NODE ACTIVATION
         * -----------------------------------------------------
         */

        activePath.forEach(
            (nodeId, index) => {

                const node =
                    document.querySelector(
                        `.cascade-map .node[data-node="${nodeId}"]`
                    );


                if(!node)
                    return;


                node.classList.add(
                    index === 0
                        ? "danger"
                        : "affected"
                );


                node.style.animationDelay =
                    `${index * 0.18}s`;

            }
        );


        /*
         * -----------------------------------------------------
         * ARROW ACTIVATION
         * -----------------------------------------------------
         */

        activePath.forEach(
            (nodeId, index) => {

                if(
                    index >=
                    activePath.length - 1
                ){
                    return;
                }


                const next =
                    activePath[index + 1];


                const arrow =
                    document.querySelector(
                        `.cascade-map .arrow[data-from="${nodeId}"][data-to="${next}"]`
                    );


                if(arrow){

                    arrow.classList.add(
                        "active"
                    );


                    arrow.style.animationDelay =
                        `${index * 0.25}s`;

                }

            }
        );


        /*
         * -----------------------------------------------------
         * PRIORITIES
         * -----------------------------------------------------
         */

        const priorityList =
            document.getElementById(
                "priorityList"
            );


        if(priorityList){

            if(cascade.length){

                priorityList.innerHTML =
                    cascade
                        .slice(0, 5)
                        .map(item => {

                            const impact =
                                Number(
                                    item.impact || 0
                                );


                            return `
                                <div class="priority-row">

                                    <span>
                                        ${item.kind || "Infrastructure"}
                                    </span>

                                    <b>
                                        ${Math.round(impact)}%
                                        ·
                                        ${item.status || "AFFECTED"}
                                    </b>

                                </div>
                            `;

                        })
                        .join("");

            }
            else{

                priorityList.innerHTML =
                    activePath
                        .map(nodeId => {

                            const node =
                                nodes[nodeId];


                            return `
                                <div class="priority-row">

                                    <span>
                                        ${node?.label || nodeId}
                                    </span>

                                    <b>
                                        MODELED IMPACT
                                    </b>

                                </div>
                            `;

                        })
                        .join("");

            }

        }


        /*
         * -----------------------------------------------------
         * GUIDANCE
         * -----------------------------------------------------
         */

        const recommended =
            Array.isArray(
                response.recommended_priority
            )
                ? response.recommended_priority
                : activePath;


        setText(
            "guidance",
            `Priority focus: ${recommended.join(" → ")}. This is a modeled scenario for decision support; verify against official warnings and field information before real-world action.`
        );


        /*
         * -----------------------------------------------------
         * MODEL STATUS
         * -----------------------------------------------------
         */

        const modelStatus =
            document.getElementById(
                "modelStatus"
            );


        if(modelStatus){

            modelStatus.textContent =
                "● BACKEND MODEL CONNECTED";

            modelStatus.classList.add(
                "online"
            );

        }


        /*
         * -----------------------------------------------------
         * ANIMATE
         * -----------------------------------------------------
         */

        animateCascade();

    }
    catch(error){

        console.error(
            "PARVAT scenario error:",
            error
        );


        setText(
            "scenarioTitle",
            "Scenario analysis unavailable"
        );


        setText(
            "scenarioSub",
            "PARVAT could not reach the simulation service."
        );


        setText(
            "guidance",
            "Check that the PARVAT backend is running, then return to What-If and run the scenario again."
        );


        const modelStatus =
            document.getElementById(
                "modelStatus"
            );


        if(modelStatus){

            modelStatus.textContent =
                "● BACKEND CONNECTION FAILED";

            modelStatus.classList.remove(
                "online"
            );

        }

    }

}



function animateCascade(){

    document
        .querySelectorAll(
            ".cascade-map .node"
        )
        .forEach(
            (element, index) => {

                element.style.animationDelay =
                    `${index * 0.12}s`;

            }
        );


    document
        .querySelectorAll(
            ".cascade-map .arrow"
        )
        .forEach(
            (element, index) => {

                element.style.animationDelay =
                    `${index * 0.16}s`;

            }
        );

}
async function report(){
 if(document.body.dataset.page!=="report")return;health();const form=document.getElementById("form"),region=document.getElementById("reportRegion"),lat=document.getElementById("lat"),lon=document.getElementById("lon"),hint=document.getElementById("locationHint"),demo=document.getElementById("demoLocation"),gps=document.getElementById("liveLocation"),type=document.getElementById("incidentType"),photo=document.getElementById("photo");
 const locations=await api("/api/demo-locations").catch(()=>({uttarakhand:{lat:30.68,lon:78.51,note:"Fictional prototype point"},himachal:{lat:32.24,lon:77.19,note:"Fictional prototype point"},nepal:{lat:28.22,lon:84.24,note:"Fictional prototype point"}}));
 const setDemo=()=>{const p=locations[region.value];lat.value=p.lat;lon.value=p.lon;hint.textContent=`${p.name} · ${p.note}`;demo.classList.add("active");gps.classList.remove("active")};setDemo();region.onchange=setDemo;demo.onclick=setDemo;
 gps.onclick=()=>{if(!navigator.geolocation){hint.textContent="This browser does not support GPS.";return}hint.textContent="Requesting device GPS…";navigator.geolocation.getCurrentPosition(p=>{lat.value=p.coords.latitude.toFixed(6);lon.value=p.coords.longitude.toFixed(6);hint.textContent=`Live device location · accuracy ±${Math.round(p.coords.accuracy)} m`;gps.classList.add("active");demo.classList.remove("active")},e=>hint.textContent="GPS unavailable: "+e.message)};
 type.onchange=()=>document.getElementById("claimOut").textContent=type.options[type.selectedIndex].text.toUpperCase();photo.onchange=()=>{document.getElementById("photoPreview").textContent=photo.files[0]?`${photo.files[0].name} · ${(photo.files[0].size/1024/1024).toFixed(2)} MB`:"No photo selected"};
 form.onsubmit=async e=>{e.preventDefault();const status=document.getElementById("reportStatus"),verify=document.getElementById("verification"),match=document.getElementById("matchOut");status.textContent="Storing field signal…";try{const body={reporter:"prototype-user",incident_type:type.value,latitude:+lat.value,longitude:+lon.value,severity:+new FormData(form).get("severity"),description:new FormData(form).get("description"),region:region.value};const created=await api("/api/incidents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(photo.files[0]){status.textContent="Photo uploaded · running evidence check…";const fd=new FormData();fd.append("file",photo.files[0]);fd.append("expected_type",type.value);const result=await api(`/api/incidents/${created.id}/photo`,{method:"POST",body:fd});const v=result.verification;match.textContent=v.match||"UNCERTAIN";verify.textContent=v.available?`${v.message} ${v.label?`Detected: ${v.label}.`:""} ${v.reason||""}`:v.message;if(v.match==="MISMATCH")verify.innerHTML=`<b style="color:#ffc4b7">PHOTO MISMATCH:</b> ${v.label||"different hazard"} was detected while the report says ${type.value.replaceAll("_"," ")}. Please review the incident type.`;}
 else {verify.textContent="Report stored. Add a photo to run the evidence-match step."}status.textContent=`Field signal #${created.id} stored in PARVAT.`;toast("Field signal submitted")}catch(x){status.textContent="Failed: "+x.message}}
}

function stuck(){

    if(document.body.dataset.page !== "stuck") return;

    health();

    const area = document.getElementById("area");
    const demo = document.getElementById("demoMode");
    const gps = document.getElementById("gpsMode");
    const analyze = document.getElementById("analyze");
    const status = document.getElementById("locStatus");
    const mapEl = document.getElementById("routeMap");
    const guidance = document.getElementById("guidanceCard");
    const source = document.getElementById("mapSource");
    const directionStrip = document.getElementById("directionStrip");


    /* =========================================================
       PARVAT PROTOTYPE LOCATIONS

       These are fictional demo locations for the hackathon.
       They are NOT real incident locations.
    ========================================================= */

    const prototypeLocations = {

        uttarakhand: {
            user: [30.6800, 78.5100],
            safe: [30.6942, 78.5281],
            name: "North Valley Demo Zone",
            safeName: "Mountain Relief Point"
        },

        himachal: {
            user: [32.2400, 77.1900],
            safe: [32.2515, 77.2078],
            name: "Upper Valley Demo Zone",
            safeName: "Valley Evacuation Point"
        },

        nepal: {
            user: [28.2200, 84.2400],
            safe: [28.2338, 84.2621],
            name: "Central Mountain Demo Zone",
            safeName: "Mountain Relief Point"
        }

    };


    let live = false;

    let map = null;

    let userMarker = null;

    let targetMarker = null;

    let routeLine = null;

    let animatedRoute = null;


    /* =========================================================
       MAP
    ========================================================= */

    map = L.map(mapEl, {

        zoomControl: false,

        attributionControl: true

    }).setView(

        prototypeLocations.uttarakhand.user,

        13

    );


    L.control.zoom({

        position: "bottomright"

    }).addTo(map);


    /* =========================================================
       SATELLITE BASE MAP
    ========================================================= */

    const satellite = L.tileLayer(

        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",

        {

            maxZoom: 19,

            attribution:
                "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics"

        }

    );


    /* =========================================================
       MAP LABELS
    ========================================================= */

    const labels = L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom: 19,

            opacity: 0.30,

            attribution:
                "© OpenStreetMap contributors"

        }

    );


    satellite.addTo(map);

    labels.addTo(map);


    /* =========================================================
       MAP INTELLIGENCE PANEL
    ========================================================= */

    const intelligence =
        document.createElement("div");

    intelligence.className =
        "map-intelligence";


    intelligence.innerHTML = `

        <span>
            PARVAT ROUTE INTELLIGENCE
        </span>

        <b>
            WAITING FOR ANALYSIS
        </b>

        <small>
            Select a region and analyze your situation.
        </small>

    `;


    mapEl.parentElement.style.position =
        "relative";


    mapEl.parentElement.appendChild(
        intelligence
    );


    /* =========================================================
       DYNAMIC PARVAT MAP CSS
    ========================================================= */

    if(!document.getElementById("parvat-stuck-style")){

        const style =
            document.createElement("style");

        style.id =
            "parvat-stuck-style";


        style.textContent = `

            .parvat-user-marker{

                width:34px;
                height:34px;

                border-radius:50%;

                background:
                    radial-gradient(
                        circle at 50% 35%,
                        #ffffff 0 18%,
                        #8ff0b4 20% 55%,
                        #174d34 58% 100%
                    );

                border:3px solid white;

                box-shadow:
                    0 0 0 7px rgba(150,255,190,.18),
                    0 0 30px rgba(150,255,190,.8);

                animation:
                    parvatUserPulse 1.8s infinite;

                position:relative;

            }


            .parvat-user-marker .user-core{

                position:absolute;

                width:8px;
                height:8px;

                left:50%;
                top:50%;

                transform:
                    translate(-50%,-50%);

                border-radius:50%;

                background:white;

                box-shadow:
                    0 0 12px white;

            }


            @keyframes parvatUserPulse{

                0%,100%{
                    transform:scale(1);
                }

                50%{
                    transform:scale(1.12);
                }

            }


            .safe-point-marker{

                width:38px;
                height:38px;

                border-radius:50%;

                display:flex;

                align-items:center;

                justify-content:center;

                background:#12291d;

                border:
                    3px solid #9ce5b9;

                color:#9ce5b9;

                font-size:20px;

                font-weight:bold;

                box-shadow:
                    0 0 0 8px rgba(156,229,185,.12),
                    0 0 30px rgba(156,229,185,.55);

                animation:
                    safePointPulse 2s infinite;

            }


            @keyframes safePointPulse{

                0%,100%{
                    transform:scale(1);
                }

                50%{
                    transform:scale(1.10);
                }

            }


            .map-intelligence{

                position:absolute;

                z-index:600;

                top:18px;

                right:18px;

                width:230px;

                padding:15px;

                border-radius:15px;

                background:
                    rgba(5,18,12,.90);

                border:
                    1px solid rgba(156,229,185,.28);

                backdrop-filter:
                    blur(14px);

                box-shadow:
                    0 20px 50px rgba(0,0,0,.5);

            }


            .map-intelligence span{

                display:block;

                font:
                    8px "DM Mono",
                    monospace;

                color:#9ce5b9;

                letter-spacing:.12em;

            }


            .map-intelligence b{

                display:block;

                margin-top:8px;

                font-size:13px;

                color:#f2fff7;

            }


            .map-intelligence small{

                display:block;

                margin-top:7px;

                color:#81988c;

                line-height:1.5;

                font-size:10px;

            }


            .parvat-route-flow{

                animation:
                    parvatRouteFlow 1.1s linear infinite;

            }


            @keyframes parvatRouteFlow{

                from{
                    stroke-dashoffset:0;
                }

                to{
                    stroke-dashoffset:-22;
                }

            }


            @media(max-width:700px){

                .map-intelligence{

                    width:180px;

                    top:10px;

                    right:10px;

                    padding:11px;

                }

                .map-intelligence b{
                    font-size:11px;
                }

                .map-intelligence small{
                    font-size:9px;
                }

            }

        `;


        document.head.appendChild(style);

    }


    /* =========================================================
       USER MARKER
    ========================================================= */

    function createUserIcon(){

        return L.divIcon({

            className:"",

            html:`

                <div class="parvat-user-marker">

                    <div class="user-core"></div>

                </div>

            `,

            iconSize:[34,34],

            iconAnchor:[17,17]

        });

    }


    /* =========================================================
       SAFE POINT MARKER
    ========================================================= */

    function createSafeIcon(){

        return L.divIcon({

            className:"",

            html:`

                <div class="safe-point-marker">
                    ✓
                </div>

            `,

            iconSize:[38,38],

            iconAnchor:[19,19]

        });

    }


    /* =========================================================
       DEMO LOCATION
    ========================================================= */

    function demoPos(){

        live = false;


        demo.classList.add("active");

        gps.classList.remove("active");


        const data =
            prototypeLocations[area.value];


        if(!data) return;


        status.textContent =
            `Prototype location loaded · ${data.name} · fictional demo data`;


        source.textContent =
            "PROTOTYPE TERRAIN";


        map.setView(

            data.user,

            13,

            {

                animate:true,

                duration:1

            }

        );


        /* Remove old route */

        if(routeLine){

            routeLine.remove();

            routeLine = null;

        }


        if(animatedRoute){

            animatedRoute.remove();

            animatedRoute = null;

        }


        /* Remove old target */

        if(targetMarker){

            targetMarker.remove();

            targetMarker = null;

        }


        /* User marker */

        if(userMarker){

            userMarker.remove();

        }


        userMarker =

            L.marker(

                data.user,

                {

                    icon:createUserIcon(),

                    zIndexOffset:1000

                }

            )

            .addTo(map)

            .bindPopup(`

                <b>PARVAT USER</b><br>

                ${data.name}<br>

                <small>
                    Fictional prototype location
                </small>

            `);


        /* Intelligence */

        intelligence.innerHTML = `

            <span>
                PARVAT ROUTE INTELLIGENCE
            </span>

            <b>
                LOCATION READY
            </b>

            <small>

                ${data.name}<br>

                Run analysis to calculate
                a modeled safe route.

            </small>

        `;


        /* Guidance */

        guidance.innerHTML = `

            <span>
                PROTOTYPE LOCATION
            </span>

            <b>
                ${data.name}
            </b>

            <small>

                Simulated Himalayan demo data.
                Not a real incident location.

            </small>

        `;


        /* Direction */

        directionStrip.innerHTML = `

            <span>⌖</span>

            <div>

                <b>
                    Prototype location loaded
                </b>

                <small>

                    Choose ANALYZE SITUATION
                    to calculate the route.

                </small>

            </div>

        `;

    }


    area.addEventListener(
        "change",
        demoPos
    );


    demo.addEventListener(
        "click",
        demoPos
    );


    /* =========================================================
       LIVE GPS
    ========================================================= */

    gps.onclick = () => {

        if(!navigator.geolocation){

            status.textContent =
                "GPS is not supported by this browser.";

            return;

        }


        status.textContent =
            "Requesting device location…";


        navigator.geolocation.getCurrentPosition(

            position => {

                live = true;


                gps.classList.add("active");

                demo.classList.remove("active");


                const lat =
                    position.coords.latitude;


                const lng =
                    position.coords.longitude;


                const current =
                    [lat,lng];


                status.textContent =
                    `Live GPS · accuracy ±${Math.round(
                        position.coords.accuracy
                    )} m`;


                source.textContent =
                    "DEVICE GPS + SATELLITE MAP";


                map.setView(

                    current,

                    14,

                    {

                        animate:true,

                        duration:1

                    }

                );


                if(userMarker){

                    userMarker.remove();

                }


                userMarker =

                    L.marker(

                        current,

                        {

                            icon:createUserIcon(),

                            zIndexOffset:1000

                        }

                    )

                    .addTo(map)

                    .bindPopup(`

                        <b>YOU</b><br>

                        Live device position

                    `)

                    .openPopup();


                intelligence.innerHTML = `

                    <span>
                        PARVAT ROUTE INTELLIGENCE
                    </span>

                    <b>
                        LIVE LOCATION DETECTED
                    </b>

                    <small>

                        Device GPS connected.<br>

                        Run analysis to calculate
                        a modeled route.

                    </small>

                `;

            },


            error => {

                status.textContent =
                    "GPS unavailable: " +
                    error.message;

                demoPos();

            },


            {

                enableHighAccuracy:true,

                timeout:10000,

                maximumAge:30000

            }

        );

    };


    /* =========================================================
       ROUTE ENGINE
    ========================================================= */

    async function route(start,end){

        const url =

            `https://router.project-osrm.org/route/v1/driving/` +

            `${start[1]},${start[0]};` +

            `${end[1]},${end[0]}` +

            `?overview=full&geometries=geojson&steps=true`;


        try{

            const response =
                await fetch(url);


            if(!response.ok){

                throw new Error(
                    "Routing service unavailable"
                );

            }


            const data =
                await response.json();


            if(!data.routes?.[0]){

                throw new Error(
                    "No route found"
                );

            }


            const rt =
                data.routes[0];


            const coords =

                rt.geometry.coordinates.map(

                    point => [
                        point[1],
                        point[0]
                    ]

                );


            /* Remove previous route */

            if(routeLine){

                routeLine.remove();

            }


            if(animatedRoute){

                animatedRoute.remove();

            }


            /* Main route */

            routeLine =

                L.polyline(

                    coords,

                    {

                        color:"#9ce5b9",

                        weight:7,

                        opacity:.92,

                        lineCap:"round",

                        lineJoin:"round"

                    }

                ).addTo(map);


            /* Animated route */

            animatedRoute =

                L.polyline(

                    coords,

                    {

                        color:"#ffffff",

                        weight:2,

                        opacity:.8,

                        dashArray:"8 14",

                        className:
                            "parvat-route-flow"

                    }

                ).addTo(map);


            /* Fit route */

            map.fitBounds(

                routeLine.getBounds(),

                {

                    padding:[60,60],

                    animate:true

                }

            );


            /* Navigation instruction */

            const step =

                rt.legs?.[0]?.steps?.find(

                    s => s.distance > 40

                );


            const instruction =

                step?.maneuver?.instruction ||

                "Follow the highlighted mountain route";


            const distance =

                (rt.distance / 1000)
                    .toFixed(1);


            const duration =

                Math.round(
                    rt.duration / 60
                );


            /* Direction strip */

            directionStrip.innerHTML = `

                <span>↑</span>

                <div>

                    <b>
                        ${instruction}
                    </b>

                    <small>

                        ${distance} km

                        · approximately
                        ${duration} min

                        · modeled PARVAT route

                    </small>

                </div>

            `;


            /* Guidance */

            guidance.innerHTML = `

                <span>
                    ROUTE READY
                </span>

                <b>

                    Follow the highlighted
                    path toward the mapped
                    safe point.

                </b>

                <small>

                    Route generated using
                    available road-network data.

                </small>

            `;


            /* Intelligence */

            intelligence.innerHTML = `

                <span>
                    PARVAT ROUTE INTELLIGENCE
                </span>

                <b>
                    LOW-RISK PATH DETECTED
                </b>

                <small>

                    ${distance} km modeled route<br>

                    ${duration} min estimated
                    travel time<br>

                    Avoid modeled hazard corridor.

                </small>

            `;


            return rt;


        }
        catch(error){

            console.error(
                "PARVAT routing error:",
                error
            );


            directionStrip.innerHTML = `

                <span>↗</span>

                <div>

                    <b>
                        Route service unavailable
                    </b>

                    <small>

                        Map position is still
                        available.

                    </small>

                </div>

            `;


            guidance.innerHTML = `

                <span>
                    ROUTE LIMITED
                </span>

                <b>

                    Location identified,
                    but routing could not
                    be calculated.

                </b>

                <small>

                    Please try the analysis again.

                </small>

            `;


            intelligence.innerHTML = `

                <span>
                    PARVAT ROUTE INTELLIGENCE
                </span>

                <b>
                    ROUTE SERVICE UNAVAILABLE
                </b>

                <small>

                    Terrain imagery remains
                    available.

                </small>

            `;


            return null;

        }

    }


    /* =========================================================
       ANALYZE SITUATION
    ========================================================= */

    analyze.onclick = async () => {

        let start;


        /* ---------------------------------------------
           USER POSITION
        --------------------------------------------- */

        if(live){

            if(!userMarker){

                status.textContent =
                    "Live position not available.";

                return;

            }


            const position =
                userMarker.getLatLng();


            start = [

                position.lat,

                position.lng

            ];

        }

        else{

            const data =
                prototypeLocations[area.value];


            start =
                data.user;

        }


        /* ---------------------------------------------
           TARGET / SAFE POINT
        --------------------------------------------- */

        let target;


        if(!live){

            target =
                prototypeLocations[
                    area.value
                ].safe;

        }

        else{

            /*
             * Prototype destination for live GPS.
             * This is a modeled nearby relief point,
             * NOT a real emergency shelter.
             */

            target = [

                start[0] + 0.008,

                start[1] + 0.012

            ];

        }


        /* ---------------------------------------------
           REMOVE OLD TARGET
        --------------------------------------------- */

        if(targetMarker){

            targetMarker.remove();

        }


        /* ---------------------------------------------
           USER MARKER
        --------------------------------------------- */

        if(userMarker){

            userMarker.remove();

        }


        userMarker =

            L.marker(

                start,

                {

                    icon:createUserIcon(),

                    zIndexOffset:1000

                }

            )

            .addTo(map)

            .bindPopup(`

                <b>YOU</b><br>

                PARVAT current position

            `);


        /* ---------------------------------------------
           SAFE POINT
        --------------------------------------------- */

        targetMarker =

            L.marker(

                target,

                {

                    icon:createSafeIcon(),

                    zIndexOffset:900

                }

            )

            .addTo(map)

            .bindPopup(`

                <b>
                    MODELED SAFE POINT
                </b><br>

                ${
                    live

                    ? "Modeled relief point"

                    : prototypeLocations[
                        area.value
                    ].safeName

                }

                <br>

                <small>
                    Prototype guidance
                </small>

            `);


        /* ---------------------------------------------
           ANALYSIS STATE
        --------------------------------------------- */

        guidance.innerHTML = `

            <span>
                ANALYZING
            </span>

            <b>

                PARVAT is checking terrain,
                route accessibility and
                mapped points…

            </b>

            <small>

                Building a modeled
                mountain escape route.

            </small>

        `;


        intelligence.innerHTML = `

            <span>
                PARVAT ROUTE INTELLIGENCE
            </span>

            <b>
                ANALYZING TERRAIN
            </b>

            <small>

                Checking road connectivity…

            </small>

        `;


        directionStrip.innerHTML = `

            <span>⌁</span>

            <div>

                <b>
                    Analyzing your situation…
                </b>

                <small>

                    Calculating a modeled
                    route to the safe point.

                </small>

            </div>

        `;


        /* ---------------------------------------------
           CALCULATE ROUTE
        --------------------------------------------- */

        const result =

            await route(
                start,
                target
            );


        /* ---------------------------------------------
           FINAL STATUS
        --------------------------------------------- */

        if(result){

            if(!live){

                const data =
                    prototypeLocations[
                        area.value
                    ];


                status.textContent =
                    `Analysis complete · ${data.name}`;

            }

            else{

                status.textContent =
                    "Analysis complete · live device position";

            }

        }

    };


    /* =========================================================
       INITIAL DEMO MODE
    ========================================================= */

    demoPos();


    /* =========================================================
       MAP RESIZE
    ========================================================= */

    window.addEventListener(

        "resize",

        () => {

            if(map){

                map.invalidateSize();

            }

        }

    );


    setTimeout(

        () => {

            if(map){

                map.invalidateSize();

            }

        },

        300

    );

}

document.addEventListener("DOMContentLoaded",()=>{dashboard();simulate();scenario();report();stuck()});
