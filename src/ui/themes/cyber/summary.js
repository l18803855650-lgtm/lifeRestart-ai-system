import { lifeSystemAssistant } from '../../../ai/systemAssistant.js';

export default class CyberSummary extends ui.view.CyberTheme.CyberSummaryUI {
    constructor() {
        super();
        this.listSelectedTalents.renderHandler = Laya.Handler.create(this, this.renderTalent, null, false);
        this.btnAgain.on(Laya.Event.CLICK, this, this.onAgain);

        this.labSystemInfo = new Laya.Label();
        this.labSystemInfo.left = 60;
        this.labSystemInfo.right = 60;
        this.labSystemInfo.y = 1218;
        this.labSystemInfo.height = 96;
        this.labSystemInfo.font = '方正像素12';
        this.labSystemInfo.fontSize = 28;
        this.labSystemInfo.color = '#8fe7ff';
        this.labSystemInfo.leading = 8;
        this.labSystemInfo.wordWrap = true;
        this.addChild(this.labSystemInfo);
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
        lifeSystemAssistant.updateSummary({ talents });

        const gradeFilters = $ui.common.filter;
        const gradeColors = $ui.common.grade;

        const age = summary[core.PropertyTypes.HAGE];
        this.labAge.text = ''+age.value;
        this.labAgeJudge.text = age.judge;
        this.labAgeJudge.color = gradeColors[age.grade];

        const sum = summary[core.PropertyTypes.SUM];
        this.labTotal.text = ''+sum.value;
        this.labTotalJudge.text = sum.judge;
        this.labTotalJudge.color = gradeColors[sum.grade];

        const chr = summary[core.PropertyTypes.HCHR];
        this.labCharm.text = ''+chr.value;
        this.prgCharm.value = chr.progress;
        this.labCharmJudge.text = chr.judge;
        this.labCharmJudge.color = gradeColors[chr.grade];
        this.boxCharmGrade.colorFilter = gradeFilters[chr.grade];

        const int = summary[core.PropertyTypes.HINT];
        this.labIntelligence.text = ''+int.value;
        this.prgIntelligence.value = int.progress;
        this.labIntelligenceJudge.text = int.judge;
        this.labIntelligenceJudge.color = gradeColors[int.grade];
        this.boxIntelligenceGrade.colorFilter = gradeFilters[int.grade];

        const str = summary[core.PropertyTypes.HSTR];
        this.labStrength.text = ''+str.value;
        this.prgStrength.value = str.progress;
        this.labStrengthJudge.text = str.judge;
        this.labStrengthJudge.color = gradeColors[str.grade];
        this.boxStrengthGrade.colorFilter = gradeFilters[str.grade];

        const mny = summary[core.PropertyTypes.HMNY];
        this.labMoney.text = ''+mny.value;
        this.prgMoney.value = mny.progress;
        this.labMoneyJudge.text = mny.judge;
        this.labMoneyJudge.color = gradeColors[mny.grade];
        this.boxMoneyGrade.colorFilter = gradeFilters[mny.grade];

        const spr = summary[core.PropertyTypes.HSPR];
        this.labSpirit.text = ''+spr.value;
        this.prgSpirit.value = spr.progress;
        this.labSpiritJudge.text = spr.judge;
        this.labSpiritJudge.color = gradeColors[spr.grade];
        this.boxSpiritGrade.colorFilter = gradeFilters[spr.grade];

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

    renderTalent(box) {
        const dataSource = box.dataSource;

        const labTitle = box.getChildByName("labTitle");
        const grade1 = box.getChildByName("grade1");
        const grade2 = box.getChildByName("grade2");
        const grade3 = box.getChildByName("grade3");
        const labDescription = box.getChildByName("labDescription");
        const selected = box.getChildByName("selected");
        const unselected = box.getChildByName("unselected");

        labTitle.text = dataSource.name;
        labDescription.text = dataSource.description;
        switch (dataSource.grade) {
            case 1:
                grade1.visible = true;
                grade2.visible = false;
                grade3.visible = false;
                break;
            case 2:
                grade1.visible = false;
                grade2.visible = true;
                grade3.visible = false;
                break;
            case 3:
                grade1.visible = false;
                grade2.visible = false;
                grade3.visible = true;
                break;
            default:
                grade1.visible = false;
                grade2.visible = false;
                grade3.visible = false;
                break;
        }

        selected.visible = dataSource.id == this.#selectedTalent;
        unselected.visible = !selected.visible;
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
