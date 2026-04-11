export function formatTrajectoryLines(content = []) {
    return content.map(({ type, description, name, postEvent, kind }) => {
        switch (type) {
            case 'TLT':
                return `天赋【${name}】发动：${description}`;
            case 'EVT':
                return description + (postEvent ? `\n${postEvent}` : '');
            case core.PropertyTypes.SYS:
                switch (kind) {
                    case 'ability':
                        return $_.format($lang.F_SystemAbilityUnlock, { name, description });
                    case 'abilityTick':
                        return $_.format($lang.F_SystemAbilityTick, { name, description });
                    case 'milestone':
                        return $_.format($lang.F_SystemProgress, { name, description });
                    default:
                        return $_.format($lang.F_SystemAwaken, { name, description });
                }
            default:
                return description || '';
        }
    }).filter(Boolean);
}
