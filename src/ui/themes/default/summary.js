export default class Summary extends ui.view.DefaultTheme.SummaryUI {
    constructor() {
        super();
        this.listSummary.renderHandler = Laya.Handler.create(this, this.renderSummary, null, false);
        this.listSelectedTalents.renderHandler = Laya.Handler.create(this, this.renderTalent, null, false);
        this.btnAgain.on(Laya.Event.CLICK, this, this.onAgain);

        this.labSystemInfo = new Laya.Label();
        this.labSystemInfo.left = 20;
        this.labSystemInfo.right = 20;
        this.labSystemInfo.top = 84;
        this.labSystemInfo.height = 92;
        this.labSystemInfo.fontSize = 24;
        this.labSystemInfo.color = '#dddddd';
        this.labSystemInfo.leading = 6;
        this.labSystemInfo.wordWrap = true;
        this.selectedTalents.addChild(this.labSystemInfo);
        this.listSelectedTalents.top = 190;
    }

    #selectedTalent;
    #enableExtend;

    onAgain() {
        core.talentExtend(this.#selectedTalent);
        core.times ++;
        $ui.switchView(UI.pages.MAIN);
    }

    init({talents, enableExtend}) {
        const {summary, lastExtendTalent, system} = core;
        this.#enableExtend = enableExtend;
        this.labSystemInfo.text = this.formatSystemInfo(system);

        this.listSummary.array = [
            [core.PropertyTypes.HCHR, $lang.UI_Property_Charm],
            [core.PropertyTypes.HINT, $lang.UI_Property_Intelligence],
            [core.PropertyTypes.HSTR, $lang.UI_Property_Strength],
            [core.PropertyTypes.HMNY, $lang.UI_Property_Money],
            [core.PropertyTypes.HSPR, $lang.UI_Property_Spirit],
            [core.PropertyTypes.HAGE, $lang.UI_Final_Age],
            [core.PropertyTypes.SUM, $lang.UI_Total_Judge],
        ].map(([type, key]) => {
            const data = summary[type];
            return {
                label: `${key}${$lang.UI_Colon} ${data.value} ${$lang[data.judge]}`,
                grade: data.grade,
            }
        });

        talents.sort(({id:a, grade:ag}, {id:b, grade:bg},)=>{
            if(a == lastExtendTalent) return -1;
            if(b == lastExtendTalent) return 1;
            return bg - ag;
        });
        if(this.#enableExtend) {
            this.#selectedTalent = talents[0].id;
        } else {
            this.#selectedTalent = lastExtendTalent;
        }
        this.listSelectedTalents.array = talents;
    }

    formatSystemInfo(system) {
        if(!system) {
            return `${$lang.UI_System_Current}${$lang.UI_Colon}${$lang.UI_System_None}`;
        }
        const abilityNames = system.abilities.map(({name})=>name);
        const abilityText = abilityNames.length > 4
            ? `${abilityNames.slice(0, 4).join(' / ')}...`
            : (abilityNames.join(' / ') || $lang.UI_System_None);
        return [
            `${$lang.UI_System_Current}${$lang.UI_Colon}${system.name} · Lv.${system.level} · ${$lang.UI_System_Points}${$lang.UI_Colon}${system.points} · ${$lang.UI_System_Fate}${$lang.UI_Colon}${system.fate} · ${$lang.UI_System_Reputation}${$lang.UI_Colon}${system.reputation}`,
            `${$lang.UI_System_Abilities}${$lang.UI_Colon}${abilityText}`,
            `${$lang.UI_System_Goal}${$lang.UI_Colon}${system.nextGoal || $lang.UI_System_None}`,
        ].join('\n');
    }

    renderSummary(box) {
        const {label, grade} = box.dataSource;
        box.label = label;
        $_.deepMapSet(box, $ui.common.summary[grade]);
    }
    renderTalent(box) {
        const dataSource = box.dataSource;
        box.label = $_.format($lang.F_TalentSelection, dataSource);
        const style = $ui.common.card[dataSource.grade];
        $_.deepMapSet(box, dataSource.id == this.#selectedTalent? style.selected: style.normal);
        box.getChildByName('blank').pause = dataSource.id != this.#selectedTalent;
        box.off(Laya.Event.CLICK, this, this.onSelectTalent);
        box.on(Laya.Event.CLICK, this, this.onSelectTalent, [dataSource.id]);
    }

    onSelectTalent(talentId) {
        if(!this.#enableExtend) {
            return $$event('message', ['M_DisableExtendTalent']);
        }
        if(talentId == this.#selectedTalent) {
            this.#selectedTalent = null;
        } else {
            this.#selectedTalent = talentId;
        }

        this.listSelectedTalents.refresh();
    }
}
