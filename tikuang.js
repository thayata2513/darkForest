class Plugin {

    constructor() {
        this.running = false;
        this.sendIntervalId = '';
        this.withdrawIntervalId = '';
        this.silverPercent = 100;
        this.maxEnergyPercent = 85;
        this.minPlanetLevel = 3;
        this.arrivalTime = {};
    }

    updateMyPlanets() {
        df.getMyPlanets().forEach((p) => {
            df.getPlanetWithId(p.locationId);
        });
    }

    sendSilverHelper(from, maxEnergyPercent) {
        const account = df.getAccount();
        const fromId = from.locationId;
        if (!from) throw new Error('origin planet unknown');

        if (from.unconfirmedDepartures.length > 0) {
            console.log('planets has unconfirmed Departures');
            return 0;
        }

        const candidates = df.getPlanetsInRange(fromId, maxEnergyPercent).filter(
            p => p.owner === account
                && p.planetType === 3
                && p.silverCap >= Math.floor(from.silverCap / 2)
        ).map(
            to => [to, distance(from, to)]
        ).sort(
            (a, b) => a[1] - b[1]
        );

        for (let i = 0; i < candidates.length; ++i) {
            const candidate = candidates[i][0];

            const energyNeeded = Math.ceil(df.getEnergyNeededForMove(fromId, candidate.locationId, 5)); //
            if (from.energy - energyNeeded < 0) {
                console.log('not enough energy');
                break;
            }

            if (candidate.destroyed) {
                console.log("can't send silver to a destroyed planet");
                continue;
            }

            const allArrivals = getPlanetArrivals(candidate.locationId);
            if (allArrivals.length + df.getUnconfirmedMoves().filter(move => move.to === candidate.locationId).length > 5) {
                console.log('to many move to target');
                continue;
            }

            if (!this.arrivalTime[candidate.locationId]) {
                this.arrivalTime[candidate.locationId] = allArrivals.map((event)=> event.arrivalTime);
            }

            //we need time to withdraw the previous silver, set to 120s
            let candidateArrivalTime = calArrivalTime(fromId, candidate.locationId);
            if (this.arrivalTime[candidate.locationId].filter(t => Math.abs(t - candidateArrivalTime) < 120).length > 0) {
                console.log('arrivals in short time...');
                continue;
            }
  

            let silverAmount = Math.min(Math.floor(from.silver), Math.floor(candidate.silverCap));

            df.terminal.current.println(
                "[SILVER AUTOMATION] move: "
                + fromId + " -> "
                + candidate.locationId
                + " silver amount: "
                + silverAmount,
                2
            );

            df.move(fromId, candidate.locationId, energyNeeded, silverAmount);
            this.arrivalTime[candidate.locationId].push(candidateArrivalTime);
            return 1;
        }
        return 0;
    }

    sendSilver() {
        this.updateMyPlanets();
        df.terminal.current.println("[SILVER AUTOMATION] checking silver", 2);
        console.log('[SILVER AUTOMATION] checking silver');

        this.arrivalTime = {};

        const filled = df.getMyPlanets().filter(
            p => p.planetType === 1
                && p.planetLevel >= this.minPlanetLevel
                && p.silver >= Math.floor(p.silverCap * (this.silverPercent / 100))
        );

        let count = 0;
        for (let i = 0; i < filled.length; ++i) {
            try {
                count += this.sendSilverHelper(filled[i], this.maxEnergyPercent);
            } catch (err) {
                console.error(err);
            }
        }

        this.arrivalTime = {};
        console.log("Collecting", count, "planets");
    }

    withdraw() {
        this.updateMyPlanets();
        df.terminal.current.println("[SILVER AUTOMATION] checking spacetime rips", 2);

        const spacetimeRips = df.getMyPlanets().filter(p => p.planetType == 3 && p.silver > 100 && !p.unconfirmedWithdrawSilver);
        for (let i = 0, len = spacetimeRips.length; i < len; ++i) {

            df.terminal.current.println(
                "[SILVER AUTOMATION] withdraw silver from "
                + spacetimeRips[i].locationId + " amount: "
                + Math.floor(spacetimeRips[i].silver),
                2
            );

            try {
                df.withdrawSilver(spacetimeRips[i].locationId, Math.floor(spacetimeRips[i].silver), false);
            } catch (err) {
                console.error(err);
            }
        }
    }

    stop() {
        if (this.sendIntervalId != '' && this.withdrawIntervalId != '') {
            clearInterval(this.sendIntervalId);
            clearInterval(this.withdrawIntervalId);
            this.sendIntervalId = '';
            this.withdrawIntervalId = '';
        }
        this.running = false;
    }

    async render(container) {
        container.style.width = '250px';
        let stepperLabel = document.createElement('label');
        stepperLabel.innerText = 'Max % energy to spend';
        stepperLabel.style.display = 'block';

        let stepper = document.createElement('input');
        stepper.type = 'range';
        stepper.min = '0';
        stepper.max = '100';
        stepper.step = '5';
        stepper.value = `${this.maxEnergyPercent}`;
        stepper.style.width = '80%';
        stepper.style.height = '24px';

        let percent = document.createElement('span');
        percent.innerText = `${stepper.value}%`;
        percent.style.float = 'right';
        stepper.onchange = (evt) => {
            percent.innerText = `${evt.target.value}%`;
            try {
                this.maxEnergyPercent = parseInt(evt.target.value, 10);
            } catch (e) {
                console.error('could not parse energy percent', e);
            }
        }

        let silverPercentLabel = document.createElement('label');
        silverPercentLabel.innerText = 'Min % silver to fire';
        silverPercentLabel.style.display = 'block';

        let silverPercenStepper = document.createElement('input');
        silverPercenStepper.type = 'range';
        silverPercenStepper.min = '0';
        silverPercenStepper.max = '100';
        silverPercenStepper.step = '5';
        silverPercenStepper.value = `${this.silverPercent}`;
        silverPercenStepper.style.width = '80%';
        silverPercenStepper.style.height = '24px';

        let silverPercentEle = document.createElement('span');
        silverPercentEle.innerText = `${silverPercenStepper.value}%`;
        silverPercentEle.style.float = 'right';
        silverPercenStepper.onchange = (evt) => {
            silverPercentEle.innerText = `${evt.target.value}%`;
            try {
                this.silverPercent = parseInt(evt.target.value, 10);
            } catch (e) {
                console.error('could not parse silver percent', e);
            }
        }

        let levelLabel = document.createElement('label');
        levelLabel.innerText = 'Min. Lvl planets to withdraw';
        levelLabel.style.display = 'block';

        let level = document.createElement('select');
        level.style.background = 'rgb(8,8,8)';
        level.style.width = '100%';
        level.style.marginTop = '10px';
        level.style.marginBottom = '10px';
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(lvl => {
            let opt = document.createElement('option');
            opt.value = `${lvl}`;
            opt.innerText = `Level ${lvl}`;
            level.appendChild(opt);
        });

        level.value = `${this.minPlanetLevel}`;
        level.onchange = (evt) => {
            try {
                this.minPlanetLevel = parseInt(evt.target.value);
            } catch (e) {
                console.error('could not parse planet level', e);
            }
        }

        //start
        let startBtn = document.createElement('button');
        startBtn.style.width = '100%';
        startBtn.style.marginBottom = '10px';
        startBtn.innerHTML = 'start'
        startBtn.onclick = () => {
            if (this.running) {
                this.stop();
                startBtn.innerHTML = 'start';
                this.messageEl.innerText = 'stopped';
            } else {
                this.running = true;
                this.sendIntervalId = setInterval(this.sendSilver.bind(this), 30 * 1000);
                this.withdrawIntervalId = setInterval(this.withdraw.bind(this), 1 * 1000);
                startBtn.innerHTML = 'stop';
            }
        };

        container.appendChild(stepperLabel);
        container.appendChild(stepper);
        container.appendChild(percent);

        container.appendChild(silverPercentLabel);
        container.appendChild(silverPercenStepper);
        container.appendChild(silverPercentEle);

        container.appendChild(levelLabel);
        container.appendChild(level);

        container.appendChild(startBtn);

    }

    destroy() {
        this.stop();
    }
}
export default Plugin;


function getPlanetArrivals(planetId) {
    return df.getAllVoyages()
        .filter(arrival => arrival.toPlanet === planetId)
        .filter(p => p.arrivalTime > Date.now() / 1000);
}

function calArrivalTime(fromId, toId) {
    return Math.ceil(Date.now() / 1000) + Math.ceil(df.getTimeForMove(fromId, toId));
}

function distance(from, to) {
    let fromloc = from.location;
    let toloc = to.location;
    return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}
