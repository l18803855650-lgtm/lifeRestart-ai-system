export default {
    "zh-cn": {
        "signin": {
            "id": "signin",
            "name": "签到暴击系统",
            "description": "靠签到滚雪球，越活越肥的稳健爽文流。",
            "theme": "养成 / 日常 / 欧皇",
            "grade": 2,
            "weights": {
                "base": 2,
                "CHR": 0.2,
                "INT": 0.4,
                "STR": 0.2,
                "MNY": 0.5
            },
            "start": {
                "level": 1,
                "energy": 3,
                "description": "你脑海里响起冰冷机械音：签到暴击系统绑定成功，首签礼包已发放。",
                "effect": {
                    "SPR": 2,
                    "PTS": 2,
                    "FATE": 1,
                    "REP": 1
                },
                "unlockAbilities": [
                    "daily-sign"
                ]
            },
            "abilities": {
                "daily-sign": {
                    "name": "每日签到",
                    "description": "每年都能薅到奖励：系统点+1，快乐+1。",
                    "tick": "你维持了一整年的签到，全勤奖励到账：系统点+1，快乐+1。",
                    "grade": 1,
                    "trigger": {
                        "every": 1,
                        "startAge": 1
                    },
                    "effect": {
                        "PTS": 1,
                        "SPR": 1
                    }
                },
                "ten-pull": {
                    "name": "十连抽",
                    "description": "每逢偶数年龄触发一次额外抽奖：系统点+1，气运+1。",
                    "tick": "系统给你补发了一次十连抽，系统点+1，气运+1。",
                    "grade": 2,
                    "trigger": {
                        "every": 2,
                        "startAge": 16
                    },
                    "effect": {
                        "PTS": 1,
                        "FATE": 1
                    }
                },
                "critical-sign": {
                    "name": "暴击签到",
                    "description": "每逢 5 的倍数年龄暴击一次，家境+2，快乐+2。",
                    "tick": "你触发了签到暴击，现实奖励同步兑现：家境+2，快乐+2。",
                    "grade": 3,
                    "trigger": {
                        "every": 5,
                        "startAge": 25
                    },
                    "effect": {
                        "MNY": 2,
                        "SPR": 2
                    }
                }
            },
            "milestones": [
                {
                    "id": "signin-16",
                    "condition": "AGE>=16",
                    "name": "签到体系升级",
                    "description": "你把签到玩成了方法论，系统升到 Lv.2。",
                    "grade": 2,
                    "levelUp": 1,
                    "effect": {
                        "INT": 1,
                        "REP": 1
                    },
                    "unlockAbilities": [
                        "ten-pull"
                    ],
                    "goal": "继续攒系统点，尽快解锁更高阶的暴击签到。"
                },
                {
                    "id": "signin-25",
                    "condition": "(AGE>=25)&(PTS>=10)",
                    "name": "欧皇眷顾",
                    "description": "系统将你识别为高活跃用户，解锁了暴击签到。",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "FATE": 2,
                        "REP": 2
                    },
                    "unlockAbilities": [
                        "critical-sign"
                    ],
                    "goal": "把签到从薅羊毛玩成真正的资源滚雪球。"
                },
                {
                    "id": "signin-35",
                    "condition": "(AGE>=35)&(PTS>=18)",
                    "name": "签到成神",
                    "description": "你的签到奖励开始稳定兑现现实回报，生活彻底进入爽文模式。",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "MNY": 3,
                        "REP": 3,
                        "SPR": 2
                    },
                    "goal": "继续保持全勤，让系统自动养你。"
                }
            ]
        },
        "cultivation": {
            "id": "cultivation",
            "name": "修仙逆袭系统",
            "description": "呼吸吐纳、境界突破、一步步把平凡人生卷成修仙爽文。",
            "theme": "修仙 / 境界 / 机缘",
            "grade": 3,
            "weights": {
                "base": 1,
                "CHR": 0.1,
                "INT": 1.1,
                "STR": 1.1,
                "MNY": 0.1
            },
            "start": {
                "level": 1,
                "energy": 4,
                "description": "你听见一道苍老声音：修仙逆袭系统已激活，从今天起，凡人也能逆天改命。",
                "effect": {
                    "INT": 1,
                    "STR": 1,
                    "ENG": 1,
                    "FATE": 2
                },
                "unlockAbilities": [
                    "breathing"
                ]
            },
            "abilities": {
                "breathing": {
                    "name": "吐纳入门",
                    "description": "每逢偶数年龄完成一次吐纳，体质+1。",
                    "tick": "你运转周天完成吐纳，体内灵气更顺，体质+1。",
                    "grade": 1,
                    "trigger": {
                        "every": 2,
                        "startAge": 2
                    },
                    "effect": {
                        "STR": 1
                    }
                },
                "spirit-stone": {
                    "name": "灵石炉",
                    "description": "每隔 3 年炼化一次资源，家境+1，系统点+1。",
                    "tick": "你卖出一炉灵石衍生品，家境+1，系统点+1。",
                    "grade": 2,
                    "trigger": {
                        "every": 3,
                        "startAge": 18
                    },
                    "effect": {
                        "MNY": 1,
                        "PTS": 1
                    }
                },
                "golden-core": {
                    "name": "金丹气场",
                    "description": "每隔 5 年威压外放，声望+2，快乐+1。",
                    "tick": "你稍微释放了一点金丹气场，周围人都开始敬你三分。",
                    "grade": 3,
                    "trigger": {
                        "every": 5,
                        "startAge": 30
                    },
                    "effect": {
                        "REP": 2,
                        "SPR": 1
                    }
                }
            },
            "milestones": [
                {
                    "id": "cultivation-15",
                    "condition": "AGE>=15",
                    "name": "炼气入门",
                    "description": "你正式踏入炼气期，系统升到 Lv.2。",
                    "grade": 2,
                    "levelUp": 1,
                    "effect": {
                        "STR": 2,
                        "INT": 1,
                        "ENG": 1
                    },
                    "goal": "把体质和智力都堆上去，冲击筑基。"
                },
                {
                    "id": "cultivation-24",
                    "condition": "(AGE>=24)&(STR>=8)&(INT>=8)",
                    "name": "筑基成功",
                    "description": "你道心稳固，成功筑基，解锁了炼资源的本事。",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "STR": 2,
                        "INT": 2,
                        "FATE": 1
                    },
                    "unlockAbilities": [
                        "spirit-stone"
                    ],
                    "goal": "继续积累底蕴，寻找结丹机缘。"
                },
                {
                    "id": "cultivation-36",
                    "condition": "(AGE>=36)&(STR>=12)&(INT>=10)",
                    "name": "金丹机缘",
                    "description": "你抓住了一次大机缘，凝成金丹，开始对现实世界产生压制力。",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "STR": 3,
                        "REP": 3,
                        "SPR": 2
                    },
                    "unlockAbilities": [
                        "golden-core"
                    ],
                    "goal": "继续闭关和历练，把凡人局打成仙侠局。"
                }
            ]
        },
        "villain": {
            "id": "villain",
            "name": "反派逆袭系统",
            "description": "专治委屈和憋屈，主打打脸、截胡、收小弟的反派流。",
            "theme": "打脸 / 反派 / 截胡",
            "grade": 2,
            "weights": {
                "base": 1,
                "CHR": 1.1,
                "INT": 0.8,
                "STR": 0.2,
                "MNY": 1.0
            },
            "start": {
                "level": 1,
                "energy": 3,
                "description": "一道邪魅提示音在你脑海里响起：反派逆袭系统绑定完成，这次轮到你做局了。",
                "effect": {
                    "REP": 2,
                    "CHR": 1,
                    "PTS": 1
                },
                "unlockAbilities": [
                    "slap-face"
                ]
            },
            "abilities": {
                "slap-face": {
                    "name": "打脸反击",
                    "description": "每隔 3 年就能逮到一次机会，声望+1，家境+1。",
                    "tick": "你逮到一个不长眼的倒霉蛋，当场打脸成功。",
                    "grade": 1,
                    "trigger": {
                        "every": 3,
                        "startAge": 15
                    },
                    "effect": {
                        "REP": 1,
                        "MNY": 1
                    }
                },
                "intercept": {
                    "name": "截胡机缘",
                    "description": "每隔 4 年截一次胡，气运+1，家境+1。",
                    "tick": "你提前拿走了本该属于别人的机缘，气运+1，家境+1。",
                    "grade": 2,
                    "trigger": {
                        "every": 4,
                        "startAge": 18
                    },
                    "effect": {
                        "FATE": 1,
                        "MNY": 1
                    }
                },
                "henchman": {
                    "name": "收小弟",
                    "description": "每隔 5 年扩张一次势力，声望+2，快乐+1。",
                    "tick": "你又收了一批能打的手下，声望+2，快乐+1。",
                    "grade": 3,
                    "trigger": {
                        "every": 5,
                        "startAge": 28
                    },
                    "effect": {
                        "REP": 2,
                        "SPR": 1
                    }
                }
            },
            "milestones": [
                {
                    "id": "villain-18",
                    "condition": "AGE>=18",
                    "name": "第一次打脸",
                    "description": "你第一次靠系统狠狠反击，开始尝到爽文主角的味道。",
                    "grade": 2,
                    "levelUp": 1,
                    "effect": {
                        "CHR": 1,
                        "REP": 1
                    },
                    "unlockAbilities": [
                        "intercept"
                    ],
                    "goal": "继续攒名望，把别人机缘都截过来。"
                },
                {
                    "id": "villain-28",
                    "condition": "(AGE>=28)&(REP>=8)",
                    "name": "幕后棋手",
                    "description": "你已经不满足于打脸了，开始做局、布局、收小弟。",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "INT": 2,
                        "REP": 2,
                        "MNY": 2
                    },
                    "unlockAbilities": [
                        "henchman"
                    ],
                    "goal": "从小反派晋升为掌盘的人。"
                },
                {
                    "id": "villain-40",
                    "condition": "(AGE>=40)&(REP>=14)",
                    "name": "反派天花板",
                    "description": "你终于把反派流打成了顶配版本，别人只能看你表演。",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "CHR": 2,
                        "INT": 2,
                        "SPR": 2
                    },
                    "goal": "继续维持压制力，让全世界替你抬轿。"
                }
            ]
        },
        "tycoon": {
            "id": "tycoon",
            "name": "神豪返利系统",
            "description": "花钱就返利，越消费越富，典型神豪文路线。",
            "theme": "神豪 / 消费 / 返利",
            "grade": 2,
            "weights": {
                "base": 1,
                "CHR": 0.6,
                "INT": 0.4,
                "STR": 0.1,
                "MNY": 1.4
            },
            "start": {
                "level": 1,
                "energy": 3,
                "description": "你绑定了神豪返利系统，只要敢花，系统就敢返。",
                "effect": {
                    "MNY": 2,
                    "REP": 1,
                    "PTS": 1,
                    "SPR": 1
                },
                "unlockAbilities": [
                    "cashback"
                ]
            },
            "abilities": {
                "cashback": {
                    "name": "消费返现",
                    "description": "每隔 2 年返一次现：家境+1，系统点+1。",
                    "tick": "你完成了一轮漂亮的返利操作，家境+1，系统点+1。",
                    "grade": 1,
                    "trigger": {
                        "every": 2,
                        "startAge": 16
                    },
                    "effect": {
                        "MNY": 1,
                        "PTS": 1
                    }
                },
                "network": {
                    "name": "豪门人脉",
                    "description": "每隔 4 年拓一次圈子：声望+2，家境+1。",
                    "tick": "你又认识了一批有用的人，声望+2，家境+1。",
                    "grade": 2,
                    "trigger": {
                        "every": 4,
                        "startAge": 22
                    },
                    "effect": {
                        "REP": 2,
                        "MNY": 1
                    }
                },
                "capital": {
                    "name": "资本运作",
                    "description": "每隔 5 年做一次大项目：家境+3，气运+1。",
                    "tick": "你用一轮漂亮的资本运作把身价再抬了一层。",
                    "grade": 3,
                    "trigger": {
                        "every": 5,
                        "startAge": 32
                    },
                    "effect": {
                        "MNY": 3,
                        "FATE": 1
                    }
                }
            },
            "milestones": [
                {
                    "id": "tycoon-18",
                    "condition": "AGE>=18",
                    "name": "第一桶金",
                    "description": "系统帮你赚到了第一桶金，花钱和挣钱第一次形成闭环。",
                    "grade": 2,
                    "levelUp": 1,
                    "effect": {
                        "MNY": 2,
                        "REP": 1
                    },
                    "goal": "继续堆本金，尽快把返利系统滚起来。"
                },
                {
                    "id": "tycoon-26",
                    "condition": "(AGE>=26)&(MNY>=8)",
                    "name": "豪门入场券",
                    "description": "你已经有资格进入真正的上层消费局，系统解锁了豪门人脉。",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "CHR": 1,
                        "REP": 2
                    },
                    "unlockAbilities": [
                        "network"
                    ],
                    "goal": "扩大人脉和资本盘子，冲更高阶返利。"
                },
                {
                    "id": "tycoon-38",
                    "condition": "(AGE>=38)&(MNY>=14)",
                    "name": "资本巨鳄",
                    "description": "你开始用钱影响规则本身，系统开放了资本运作模块。",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "MNY": 3,
                        "REP": 3,
                        "INT": 1
                    },
                    "unlockAbilities": [
                        "capital"
                    ],
                    "goal": "把人生玩成真正的神豪爽文。"
                }
            ]
        }
    },
    "en-us": {
        "signin": {
            "id": "signin",
            "name": "Check-in Critical System",
            "description": "A steady power-fantasy route where daily check-ins snowball into a better life.",
            "theme": "growth / slice of life / luck",
            "grade": 2,
            "weights": {
                "base": 2,
                "CHR": 0.2,
                "INT": 0.4,
                "STR": 0.2,
                "MNY": 0.5
            },
            "start": {
                "level": 1,
                "energy": 3,
                "description": "A cold mechanical voice echoes in your head: Check-in Critical System bound successfully. Starter rewards delivered.",
                "effect": {
                    "SPR": 2,
                    "PTS": 2,
                    "FATE": 1,
                    "REP": 1
                },
                "unlockAbilities": [
                    "daily-sign"
                ]
            },
            "abilities": {
                "daily-sign": {
                    "name": "Daily Check-in",
                    "description": "Every year you farm one more reward: system points +1, spirit +1.",
                    "tick": "You kept a full year of check-ins. Attendance reward claimed: system points +1, spirit +1.",
                    "grade": 1,
                    "trigger": {
                        "every": 1,
                        "startAge": 1
                    },
                    "effect": {
                        "PTS": 1,
                        "SPR": 1
                    }
                },
                "ten-pull": {
                    "name": "Ten Pull",
                    "description": "At every even age you get a bonus draw: system points +1, fate +1.",
                    "tick": "The system hands you a bonus ten-pull. System points +1, fate +1.",
                    "grade": 2,
                    "trigger": {
                        "every": 2,
                        "startAge": 16
                    },
                    "effect": {
                        "PTS": 1,
                        "FATE": 1
                    }
                },
                "critical-sign": {
                    "name": "Critical Check-in",
                    "description": "At every age divisible by 5 you land a crit: money +2, spirit +2.",
                    "tick": "Critical check-in triggered. Real-world rewards cash out immediately: money +2, spirit +2.",
                    "grade": 3,
                    "trigger": {
                        "every": 5,
                        "startAge": 25
                    },
                    "effect": {
                        "MNY": 2,
                        "SPR": 2
                    }
                }
            },
            "milestones": [
                {
                    "id": "signin-16",
                    "condition": "AGE>=16",
                    "name": "Check-in Upgrade",
                    "description": "You turned checking in into a full methodology. The system rises to Lv.2.",
                    "grade": 2,
                    "levelUp": 1,
                    "effect": {
                        "INT": 1,
                        "REP": 1
                    },
                    "unlockAbilities": [
                        "ten-pull"
                    ],
                    "goal": "Keep stacking system points and unlock higher-tier crit rewards."
                },
                {
                    "id": "signin-25",
                    "condition": "(AGE>=25)&(PTS>=10)",
                    "name": "Favored by Luck",
                    "description": "The system marks you as a high-activity user and unlocks Critical Check-in.",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "FATE": 2,
                        "REP": 2
                    },
                    "unlockAbilities": [
                        "critical-sign"
                    ],
                    "goal": "Turn harmless farming into a true snowball engine."
                },
                {
                    "id": "signin-35",
                    "condition": "(AGE>=35)&(PTS>=18)",
                    "name": "Check-in Ascension",
                    "description": "Your check-in rewards now reshape your real life. The power fantasy is fully online.",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "MNY": 3,
                        "REP": 3,
                        "SPR": 2
                    },
                    "goal": "Stay consistent and let the system carry the rest."
                }
            ]
        },
        "cultivation": {
            "id": "cultivation",
            "name": "Cultivation Reversal System",
            "description": "Breathing, breakthroughs, and steady realm progression turn an ordinary life into a xianxia story.",
            "theme": "cultivation / realms / opportunities",
            "grade": 3,
            "weights": {
                "base": 1,
                "CHR": 0.1,
                "INT": 1.1,
                "STR": 1.1,
                "MNY": 0.1
            },
            "start": {
                "level": 1,
                "energy": 4,
                "description": "An ancient voice whispers: Cultivation Reversal System activated. Even mortals may now defy fate.",
                "effect": {
                    "INT": 1,
                    "STR": 1,
                    "ENG": 1,
                    "FATE": 2
                },
                "unlockAbilities": [
                    "breathing"
                ]
            },
            "abilities": {
                "breathing": {
                    "name": "Basic Breathing",
                    "description": "At every even age you complete a cultivation cycle: strength +1.",
                    "tick": "You circulate spiritual energy through one full cycle. Your body grows stronger. Strength +1.",
                    "grade": 1,
                    "trigger": {
                        "every": 2,
                        "startAge": 2
                    },
                    "effect": {
                        "STR": 1
                    }
                },
                "spirit-stone": {
                    "name": "Spirit-Stone Furnace",
                    "description": "Every 3 years you refine resources: money +1, system points +1.",
                    "tick": "You sell the output of another furnace batch. Money +1, system points +1.",
                    "grade": 2,
                    "trigger": {
                        "every": 3,
                        "startAge": 18
                    },
                    "effect": {
                        "MNY": 1,
                        "PTS": 1
                    }
                },
                "golden-core": {
                    "name": "Golden Core Aura",
                    "description": "Every 5 years your aura suppresses others: reputation +2, spirit +1.",
                    "tick": "You let a little Golden Core pressure leak out. People around you instantly act respectful.",
                    "grade": 3,
                    "trigger": {
                        "every": 5,
                        "startAge": 30
                    },
                    "effect": {
                        "REP": 2,
                        "SPR": 1
                    }
                }
            },
            "milestones": [
                {
                    "id": "cultivation-15",
                    "condition": "AGE>=15",
                    "name": "Qi Refinement",
                    "description": "You truly step into cultivation and the system rises to Lv.2.",
                    "grade": 2,
                    "levelUp": 1,
                    "effect": {
                        "STR": 2,
                        "INT": 1,
                        "ENG": 1
                    },
                    "goal": "Raise both body and mind high enough to attempt Foundation Establishment."
                },
                {
                    "id": "cultivation-24",
                    "condition": "(AGE>=24)&(STR>=8)&(INT>=8)",
                    "name": "Foundation Establishment",
                    "description": "Your dao heart stabilizes. You successfully establish your foundation and unlock resource refining.",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "STR": 2,
                        "INT": 2,
                        "FATE": 1
                    },
                    "unlockAbilities": [
                        "spirit-stone"
                    ],
                    "goal": "Accumulate more depth and search for a Golden Core opportunity."
                },
                {
                    "id": "cultivation-36",
                    "condition": "(AGE>=36)&(STR>=12)&(INT>=10)",
                    "name": "Golden Core Opportunity",
                    "description": "You seize a major opportunity, condense a Golden Core, and begin overwhelming ordinary reality itself.",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "STR": 3,
                        "REP": 3,
                        "SPR": 2
                    },
                    "unlockAbilities": [
                        "golden-core"
                    ],
                    "goal": "Keep cultivating until your ordinary life becomes outright mythic."
                }
            ]
        },
        "villain": {
            "id": "villain",
            "name": "Villain Comeback System",
            "description": "A route built around face-slapping, interception, underlings, and stylish revenge.",
            "theme": "face-slapping / villain / interception",
            "grade": 2,
            "weights": {
                "base": 1,
                "CHR": 1.1,
                "INT": 0.8,
                "STR": 0.2,
                "MNY": 1.0
            },
            "start": {
                "level": 1,
                "energy": 3,
                "description": "A wicked prompt chimes in your head: Villain Comeback System bound. This time, you run the game.",
                "effect": {
                    "REP": 2,
                    "CHR": 1,
                    "PTS": 1
                },
                "unlockAbilities": [
                    "slap-face"
                ]
            },
            "abilities": {
                "slap-face": {
                    "name": "Face-Slapping Counterattack",
                    "description": "Every 3 years you find another target: reputation +1, money +1.",
                    "tick": "You catch another fool acting above their station and publicly shut them down.",
                    "grade": 1,
                    "trigger": {
                        "every": 3,
                        "startAge": 15
                    },
                    "effect": {
                        "REP": 1,
                        "MNY": 1
                    }
                },
                "intercept": {
                    "name": "Opportunity Interception",
                    "description": "Every 4 years you steal someone else’s lucky break: fate +1, money +1.",
                    "tick": "You intercept an opportunity meant for someone else. Fate +1, money +1.",
                    "grade": 2,
                    "trigger": {
                        "every": 4,
                        "startAge": 18
                    },
                    "effect": {
                        "FATE": 1,
                        "MNY": 1
                    }
                },
                "henchman": {
                    "name": "Recruit Henchmen",
                    "description": "Every 5 years you expand your faction: reputation +2, spirit +1.",
                    "tick": "You gather another useful batch of followers. Reputation +2, spirit +1.",
                    "grade": 3,
                    "trigger": {
                        "every": 5,
                        "startAge": 28
                    },
                    "effect": {
                        "REP": 2,
                        "SPR": 1
                    }
                }
            },
            "milestones": [
                {
                    "id": "villain-18",
                    "condition": "AGE>=18",
                    "name": "First Public Reversal",
                    "description": "Your first decisive comeback lands. The life of a power-fantasy antihero begins.",
                    "grade": 2,
                    "levelUp": 1,
                    "effect": {
                        "CHR": 1,
                        "REP": 1
                    },
                    "unlockAbilities": [
                        "intercept"
                    ],
                    "goal": "Keep building status until you can steal opportunities at will."
                },
                {
                    "id": "villain-28",
                    "condition": "(AGE>=28)&(REP>=8)",
                    "name": "Mastermind",
                    "description": "You stop reacting and start arranging the board yourself. Underlings included.",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "INT": 2,
                        "REP": 2,
                        "MNY": 2
                    },
                    "unlockAbilities": [
                        "henchman"
                    ],
                    "goal": "Ascend from petty villain to true controller of the scene."
                },
                {
                    "id": "villain-40",
                    "condition": "(AGE>=40)&(REP>=14)",
                    "name": "Peak Villain",
                    "description": "You max out the villain route. Everyone else is just part of your performance now.",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "CHR": 2,
                        "INT": 2,
                        "SPR": 2
                    },
                    "goal": "Maintain dominance and let the whole world carry your stage lights."
                }
            ]
        },
        "tycoon": {
            "id": "tycoon",
            "name": "Tycoon Cashback System",
            "description": "Spend to earn, earn to spend, and turn life into a money-loop fantasy.",
            "theme": "tycoon / cashback / capital",
            "grade": 2,
            "weights": {
                "base": 1,
                "CHR": 0.6,
                "INT": 0.4,
                "STR": 0.1,
                "MNY": 1.4
            },
            "start": {
                "level": 1,
                "energy": 3,
                "description": "You bind the Tycoon Cashback System. If you dare to spend, the system dares to return it.",
                "effect": {
                    "MNY": 2,
                    "REP": 1,
                    "PTS": 1,
                    "SPR": 1
                },
                "unlockAbilities": [
                    "cashback"
                ]
            },
            "abilities": {
                "cashback": {
                    "name": "Cashback",
                    "description": "Every 2 years you trigger another return cycle: money +1, system points +1.",
                    "tick": "Another return cycle closes beautifully. Money +1, system points +1.",
                    "grade": 1,
                    "trigger": {
                        "every": 2,
                        "startAge": 16
                    },
                    "effect": {
                        "MNY": 1,
                        "PTS": 1
                    }
                },
                "network": {
                    "name": "Elite Network",
                    "description": "Every 4 years you expand your circle: reputation +2, money +1.",
                    "tick": "You add another tier of useful contacts to your network. Reputation +2, money +1.",
                    "grade": 2,
                    "trigger": {
                        "every": 4,
                        "startAge": 22
                    },
                    "effect": {
                        "REP": 2,
                        "MNY": 1
                    }
                },
                "capital": {
                    "name": "Capital Operation",
                    "description": "Every 5 years you pull off a major financial move: money +3, fate +1.",
                    "tick": "A beautifully timed capital play pushes your net worth even higher.",
                    "grade": 3,
                    "trigger": {
                        "every": 5,
                        "startAge": 32
                    },
                    "effect": {
                        "MNY": 3,
                        "FATE": 1
                    }
                }
            },
            "milestones": [
                {
                    "id": "tycoon-18",
                    "condition": "AGE>=18",
                    "name": "First Bucket of Gold",
                    "description": "The system helps you earn your first serious money, closing the loop between spending and profit.",
                    "grade": 2,
                    "levelUp": 1,
                    "effect": {
                        "MNY": 2,
                        "REP": 1
                    },
                    "goal": "Keep compounding your principal until the system truly starts printing."
                },
                {
                    "id": "tycoon-26",
                    "condition": "(AGE>=26)&(MNY>=8)",
                    "name": "Entry Ticket to the High Table",
                    "description": "You can now enter real upper-tier consumption scenes. The system unlocks elite networking.",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "CHR": 1,
                        "REP": 2
                    },
                    "unlockAbilities": [
                        "network"
                    ],
                    "goal": "Expand your network and capital base for the next leap."
                },
                {
                    "id": "tycoon-38",
                    "condition": "(AGE>=38)&(MNY>=14)",
                    "name": "Capital Predator",
                    "description": "You start using money to shape the rules themselves. Capital Operation is now unlocked.",
                    "grade": 3,
                    "levelUp": 1,
                    "effect": {
                        "MNY": 3,
                        "REP": 3,
                        "INT": 1
                    },
                    "unlockAbilities": [
                        "capital"
                    ],
                    "goal": "Push life all the way into true tycoon-fantasy territory."
                }
            ]
        }
    }
};
