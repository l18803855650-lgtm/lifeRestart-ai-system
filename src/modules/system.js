class System {
    constructor(system) {
        this.#system = system;
    }

    #system;
    #systems = {};
    #activeSystemId = null;
    #triggeredMilestones = new Set();

    initial({systems = {}}) {
        this.#systems = {};
        for (const id in systems) {
            const system = this.#system.clone(systems[id]);
            system.id = system.id || id;
            system.grade = Number(system.grade) || 0;
            system.weights = system.weights || { base: 1 };
            system.start = system.start || {};
            system.start.level = Number(system.start.level || 1);
            system.start.energy = Number(system.start.energy || 3);
            system.abilities = system.abilities || {};
            system.milestones = (system.milestones || []).map(milestone => ({
                ...milestone,
                grade: Number(milestone.grade) || system.grade || 0,
                levelUp: Number(milestone.levelUp || 0),
            }));
            this.#systems[system.id] = system;
        }
        return this.count;
    }

    get count() {
        return Object.keys(this.#systems).length;
    }

    get #prop() {
        return this.#system.request(this.#system.Module.PROPERTY);
    }

    get(talentId) {
        const system = this.#systems[talentId];
        if (!system) throw new Error(`[ERROR] No System[${talentId}]`);
        return this.#system.clone(system);
    }

    get current() {
        if (!this.#activeSystemId) return null;
        return this.get(this.#activeSystemId);
    }

    start({ allocation = {} } = {}) {
        this.#triggeredMilestones = new Set();
        this.#activeSystemId = this.#pickSystem(allocation);
        if (!this.#activeSystemId) return [];

        const current = this.current;
        const types = this.#prop.TYPES;
        this.#prop.set(types.SYS, current.id);
        this.#prop.set(types.SYSLV, current.start.level || 1);
        this.#prop.set(types.PTS, 0);
        this.#prop.set(types.FATE, 0);
        this.#prop.set(types.REP, 0);
        this.#prop.set(types.ENG, current.start.energy || 3);
        this.#prop.set(types.ABI, []);

        const content = [{
            type: types.SYS,
            kind: 'system',
            name: current.name,
            grade: current.grade,
            description: current.start.description || current.description,
        }];

        if (current.start.effect) this.#prop.effect(current.start.effect);
        content.push(...this.#unlockAbilities(current.start.unlockAbilities));
        return content;
    }

    next(age) {
        if (!this.#activeSystemId) return [];
        return [
            ...this.#triggerMilestones(age),
            ...this.#triggerAbilities(age),
        ];
    }

    get snapshot() {
        const current = this.current;
        if (!current) return null;

        const types = this.#prop.TYPES;
        const abilityIds = this.#prop.get(types.ABI) || [];
        const abilities = abilityIds
            .map(id => current.abilities[id])
            .filter(Boolean)
            .map(ability => ({
                name: ability.name,
                description: ability.description,
                grade: Number(ability.grade) || 0,
            }));
        const nextGoal = (current.milestones || []).find(({ id, condition }) => {
            if (this.#triggeredMilestones.has(id)) return false;
            if (!condition) return true;
            return !this.#system.check(condition);
        }) || (current.milestones || []).find(({ id }) => !this.#triggeredMilestones.has(id));

        return {
            id: current.id,
            name: current.name,
            description: current.description,
            theme: current.theme,
            level: this.#prop.get(types.SYSLV),
            points: this.#prop.get(types.PTS),
            fate: this.#prop.get(types.FATE),
            reputation: this.#prop.get(types.REP),
            energy: this.#prop.get(types.ENG),
            abilities,
            nextGoal: nextGoal?.goal || nextGoal?.description || current.goal || '',
        };
    }

    #pickSystem(allocation) {
        const systems = Object.values(this.#systems);
        if (!systems.length) return null;
        const wr = this.#system.function(this.#system.Function.UTIL).weightRandom;
        const weighted = systems.map(system => [system.id, this.#calcWeight(system, allocation)]);
        return wr(weighted);
    }

    #calcWeight(system, allocation) {
        const weights = system.weights || {};
        let score = Number(weights.base || 1);
        for (const key in allocation) {
            score += Number(allocation[key] || 0) * Number(weights[key] || 0);
        }
        return Math.max(score, 1);
    }

    #unlockAbilities(abilityIds = []) {
        if (!abilityIds) return [];
        const ids = Array.isArray(abilityIds) ? abilityIds : [abilityIds];
        const current = this.current;
        if (!current) return [];

        const contents = [];
        const unlocked = new Set(this.#prop.get(this.#prop.TYPES.ABI) || []);
        for (const id of ids) {
            if (!id || unlocked.has(id)) continue;
            const ability = current.abilities[id];
            if (!ability) continue;
            unlocked.add(id);
            this.#prop.change(this.#prop.TYPES.ABI, id);
            contents.push({
                type: this.#prop.TYPES.SYS,
                kind: 'ability',
                name: ability.name,
                grade: Number(ability.grade) || current.grade || 0,
                description: ability.description,
            });
        }
        return contents;
    }

    #triggerMilestones(age) {
        const current = this.current;
        if (!current) return [];

        const contents = [];
        for (const milestone of current.milestones || []) {
            if (this.#triggeredMilestones.has(milestone.id)) continue;
            if (milestone.minAge != null && age < milestone.minAge) continue;
            if (milestone.maxAge != null && age > milestone.maxAge) continue;
            if (milestone.condition && !this.#system.check(milestone.condition)) continue;

            this.#triggeredMilestones.add(milestone.id);
            if (milestone.levelUp) this.#prop.change(this.#prop.TYPES.SYSLV, milestone.levelUp);
            if (milestone.effect) this.#prop.effect(milestone.effect);
            contents.push({
                type: this.#prop.TYPES.SYS,
                kind: 'milestone',
                name: milestone.name,
                grade: Number(milestone.grade) || current.grade || 0,
                description: milestone.description,
            });
            contents.push(...this.#unlockAbilities(milestone.unlockAbilities));
        }
        return contents;
    }

    #triggerAbilities(age) {
        const current = this.current;
        if (!current) return [];

        const abilityIds = this.#prop.get(this.#prop.TYPES.ABI) || [];
        const contents = [];
        for (const abilityId of abilityIds) {
            const ability = current.abilities[abilityId];
            if (!ability?.trigger) continue;
            if (!this.#isAbilityTriggered(ability.trigger, age)) continue;
            if (ability.effect) this.#prop.effect(ability.effect);
            contents.push({
                type: this.#prop.TYPES.SYS,
                kind: 'abilityTick',
                name: ability.name,
                grade: Number(ability.grade) || current.grade || 0,
                description: ability.tick || ability.description,
            });
        }
        return contents;
    }

    #isAbilityTriggered(trigger, age) {
        const startAge = Number(trigger.startAge || 0);
        if (age < startAge) return false;
        if (trigger.condition && !this.#system.check(trigger.condition)) return false;
        const every = Number(trigger.every || 0);
        if (!every) return true;
        return (age - startAge) % every === 0;
    }
}

export default System;
