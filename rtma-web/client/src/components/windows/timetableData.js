// timetableData.js
// 米倉鉄道 砂森本線・加屋線・砂野線(囲森ー加磨ー桐屋ー砂原)(愛称 江乃原線) の下り時刻表データ
// アップロードされた .oud2 ファイルから抽出・変換したもの(EkiJikoku のパースは簡易実装)。
// 運用番号(duty)/始発駅作業/終着駅作業は元データの運用チェーン解決が必要なため未実装(空文字)。
// times の各エントリは { track?, dep?, arr?, pass? } で、pass:true は運行区間内での通過(レ)を表す。

export const stations = [
    {
        "id": "st0",
        "name": "囲森",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st1",
        "name": "室川福田",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st2",
        "name": "蓮間",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st3",
        "name": "菅沼",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st4",
        "name": "楠手",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st5",
        "name": "南楠手",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st6",
        "name": "棚川",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st7",
        "name": "横賀",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st8",
        "name": "深森",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st9",
        "name": "昼川温泉",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st10",
        "name": "新邦山",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st11",
        "name": "峰谷",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st12",
        "name": "大谷地",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st13",
        "name": "遠矢",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st14",
        "name": "淡海田原",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st15",
        "name": "椚原",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st16",
        "name": "東江乃原",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st17",
        "name": "江乃原",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st18",
        "name": "西江乃",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st19",
        "name": "箕町",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st20",
        "name": "町川",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st21",
        "name": "淡海一宮",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st22",
        "name": "淡海木戸",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st23",
        "name": "東加磨",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st24",
        "name": "加磨",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st25",
        "name": "龍田",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st26",
        "name": "淡海崎",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st27",
        "name": "霞路",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st28",
        "name": "結塚",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st29",
        "name": "東本町",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st30",
        "name": "桐屋本町",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st31",
        "name": "本町通",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st32",
        "name": "多瀬ノ宮",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st33",
        "name": "桐屋",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st34",
        "name": "西桐屋",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st35",
        "name": "蘇辺",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st36",
        "name": "夜寄",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st37",
        "name": "巻潟",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st38",
        "name": "下小達",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st39",
        "name": "元勝願寺",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st40",
        "name": "出洲北浜",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st41",
        "name": "岸ノ戸",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st42",
        "name": "西岸ノ戸",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st43",
        "name": "小高辺",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st44",
        "name": "出洲松岸",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st45",
        "name": "恵地",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st46",
        "name": "崎付",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st47",
        "name": "橋口",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st48",
        "name": "酉屋",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st49",
        "name": "出洲追分",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st50",
        "name": "指路",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st51",
        "name": "砂堀",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st52",
        "name": "東砂原",
        "hasTrack": false,
        "hasDep": true,
        "hasArr": false
    },
    {
        "id": "st53",
        "name": "砂原",
        "hasTrack": true,
        "hasDep": true,
        "hasArr": true
    },
    {
        "id": "st54",
        "name": "南砂原",
        "hasTrack": true,
        "hasDep": false,
        "hasArr": true
    }
];

export const trains = [
    {
        "id": "t0",
        "trainNo": "",
        "duty": "",
        "type": "回送",
        "name": "",
        "startStation": "室川福田",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st1": {
                "track": "2",
                "dep": "442"
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "456"
            }
        }
    },
    {
        "id": "t1",
        "trainNo": "",
        "duty": "",
        "type": "回送",
        "name": "",
        "startStation": "横賀",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st7": {
                "track": "2",
                "dep": "447"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "500"
            }
        }
    },
    {
        "id": "t2",
        "trainNo": "",
        "duty": "",
        "type": "回送",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "淡海崎",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "450"
            },
            "st25": {
                "pass": true
            },
            "st26": {
                "track": "2",
                "arr": "458",
                "dep": "458"
            }
        }
    },
    {
        "id": "t3",
        "trainNo": "",
        "duty": "",
        "type": "回送",
        "name": "",
        "startStation": "室川福田",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st1": {
                "track": "2",
                "dep": "540"
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "554"
            }
        }
    },
    {
        "id": "t4",
        "trainNo": "",
        "duty": "",
        "type": "回送",
        "name": "",
        "startStation": "室川福田",
        "startWork": "",
        "endStation": "横賀",
        "endWork": "",
        "times": {
            "st1": {
                "track": "2",
                "dep": "551"
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "605",
                "dep": "605"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "617"
            }
        }
    },
    {
        "id": "t5",
        "trainNo": "501N",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "恵地",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st45": {
                "track": "2",
                "dep": "502"
            },
            "st46": {
                "track": "2",
                "arr": "506",
                "dep": "506"
            },
            "st47": {
                "track": "2",
                "arr": "513",
                "dep": "513"
            },
            "st48": {
                "track": "2",
                "arr": "517",
                "dep": "517"
            },
            "st49": {
                "track": "2",
                "arr": "522",
                "dep": "522"
            },
            "st50": {
                "track": "2",
                "arr": "525",
                "dep": "525"
            },
            "st51": {
                "track": "2",
                "arr": "529",
                "dep": "529"
            },
            "st52": {
                "track": "2",
                "arr": "533",
                "dep": "533"
            },
            "st53": {
                "track": "2",
                "arr": "536",
                "dep": "540"
            },
            "st54": {
                "track": "2",
                "arr": "545"
            }
        }
    },
    {
        "id": "t6",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "岸ノ戸",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st41": {
                "track": "2",
                "dep": "500"
            },
            "st42": {
                "track": "2",
                "arr": "503",
                "dep": "503"
            },
            "st43": {
                "track": "2",
                "arr": "508",
                "dep": "508"
            },
            "st44": {
                "track": "2",
                "arr": "512",
                "dep": "512"
            },
            "st45": {
                "track": "2",
                "arr": "517",
                "dep": "517"
            },
            "st46": {
                "track": "2",
                "arr": "521",
                "dep": "521"
            },
            "st47": {
                "track": "2",
                "arr": "528",
                "dep": "528"
            },
            "st48": {
                "track": "2",
                "arr": "532",
                "dep": "536"
            },
            "st49": {
                "track": "2",
                "arr": "541",
                "dep": "541"
            },
            "st50": {
                "track": "2",
                "arr": "544",
                "dep": "544"
            },
            "st51": {
                "track": "2",
                "arr": "548",
                "dep": "548"
            },
            "st52": {
                "track": "2",
                "arr": "552",
                "dep": "552"
            },
            "st53": {
                "track": "2",
                "arr": "555"
            }
        }
    },
    {
        "id": "t7",
        "trainNo": "3501N",
        "duty": "",
        "type": "快速",
        "name": "サハラeライナー",
        "startStation": "岸ノ戸",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st41": {
                "track": "2",
                "dep": "510"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "516",
                "dep": "516"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "523",
                "dep": "523"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "538",
                "dep": "538"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "549"
            }
        }
    },
    {
        "id": "t8",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "恵地",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st45": {
                "track": "2",
                "dep": "532"
            },
            "st46": {
                "track": "2",
                "arr": "536",
                "dep": "536"
            },
            "st47": {
                "track": "2",
                "arr": "543",
                "dep": "543"
            },
            "st48": {
                "track": "2",
                "arr": "547",
                "dep": "551"
            },
            "st49": {
                "track": "2",
                "arr": "556",
                "dep": "556"
            },
            "st50": {
                "track": "2",
                "arr": "559",
                "dep": "559"
            },
            "st51": {
                "track": "2",
                "arr": "603",
                "dep": "603"
            },
            "st52": {
                "track": "2",
                "arr": "607",
                "dep": "607"
            },
            "st53": {
                "track": "2",
                "arr": "610"
            }
        }
    },
    {
        "id": "t9",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "岸ノ戸",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st41": {
                "track": "2",
                "dep": "530"
            },
            "st42": {
                "track": "2",
                "arr": "533",
                "dep": "533"
            },
            "st43": {
                "track": "2",
                "arr": "538",
                "dep": "538"
            },
            "st44": {
                "track": "2",
                "arr": "542",
                "dep": "542"
            },
            "st45": {
                "track": "2",
                "arr": "547",
                "dep": "547"
            },
            "st46": {
                "track": "2",
                "arr": "551",
                "dep": "551"
            },
            "st47": {
                "track": "2",
                "arr": "558",
                "dep": "558"
            },
            "st48": {
                "track": "2",
                "arr": "602",
                "dep": "606"
            },
            "st49": {
                "track": "2",
                "arr": "611",
                "dep": "611"
            },
            "st50": {
                "track": "2",
                "arr": "614",
                "dep": "614"
            },
            "st51": {
                "track": "2",
                "arr": "618",
                "dep": "618"
            },
            "st52": {
                "track": "2",
                "arr": "622",
                "dep": "622"
            },
            "st53": {
                "track": "2",
                "arr": "625"
            }
        }
    },
    {
        "id": "t10",
        "trainNo": "3503N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "500"
            },
            "st34": {
                "track": "2",
                "arr": "503",
                "dep": "503"
            },
            "st35": {
                "track": "2",
                "arr": "506",
                "dep": "506"
            },
            "st36": {
                "track": "2",
                "arr": "511",
                "dep": "511"
            },
            "st37": {
                "track": "2",
                "arr": "517",
                "dep": "517"
            },
            "st38": {
                "track": "2",
                "arr": "523",
                "dep": "523"
            },
            "st39": {
                "track": "2",
                "arr": "529",
                "dep": "529"
            },
            "st40": {
                "track": "2",
                "arr": "534",
                "dep": "534"
            },
            "st41": {
                "track": "2",
                "arr": "538",
                "dep": "540"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "546",
                "dep": "546"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "553",
                "dep": "553"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "608",
                "dep": "608"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "619",
                "dep": "620"
            },
            "st54": {
                "track": "2",
                "arr": "625"
            }
        }
    },
    {
        "id": "t11",
        "trainNo": "501N",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "恵地",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st45": {
                "track": "2",
                "dep": "602"
            },
            "st46": {
                "track": "2",
                "arr": "606",
                "dep": "606"
            },
            "st47": {
                "track": "2",
                "arr": "613",
                "dep": "613"
            },
            "st48": {
                "track": "2",
                "arr": "617",
                "dep": "617"
            },
            "st49": {
                "track": "2",
                "arr": "622",
                "dep": "622"
            },
            "st50": {
                "track": "2",
                "arr": "625",
                "dep": "625"
            },
            "st51": {
                "track": "2",
                "arr": "629",
                "dep": "629"
            },
            "st52": {
                "track": "2",
                "arr": "633",
                "dep": "633"
            },
            "st53": {
                "track": "2",
                "arr": "636"
            }
        }
    },
    {
        "id": "t12",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "元勝願寺",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st39": {
                "track": "2",
                "dep": "550"
            },
            "st40": {
                "track": "2",
                "arr": "555",
                "dep": "555"
            },
            "st41": {
                "track": "2",
                "arr": "559",
                "dep": "600"
            },
            "st42": {
                "track": "2",
                "arr": "603",
                "dep": "603"
            },
            "st43": {
                "track": "2",
                "arr": "608",
                "dep": "608"
            },
            "st44": {
                "track": "2",
                "arr": "612",
                "dep": "612"
            },
            "st45": {
                "track": "2",
                "arr": "617",
                "dep": "617"
            },
            "st46": {
                "track": "2",
                "arr": "621",
                "dep": "621"
            },
            "st47": {
                "track": "2",
                "arr": "628",
                "dep": "628"
            },
            "st48": {
                "track": "2",
                "arr": "632",
                "dep": "636"
            },
            "st49": {
                "track": "2",
                "arr": "641",
                "dep": "641"
            },
            "st50": {
                "track": "2",
                "arr": "644",
                "dep": "644"
            },
            "st51": {
                "track": "2",
                "arr": "648",
                "dep": "648"
            },
            "st52": {
                "track": "2",
                "arr": "652",
                "dep": "652"
            },
            "st53": {
                "track": "2",
                "arr": "655"
            }
        }
    },
    {
        "id": "t13",
        "trainNo": "3505N",
        "duty": "",
        "type": "快速",
        "name": "サハラeライナー",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "526"
            },
            "st31": {
                "track": "2",
                "arr": "530",
                "dep": "530"
            },
            "st32": {
                "track": "2",
                "arr": "533",
                "dep": "533"
            },
            "st33": {
                "track": "2",
                "arr": "536",
                "dep": "537"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "546",
                "dep": "546"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "601",
                "dep": "601"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "608",
                "dep": "610"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "616",
                "dep": "616"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "623",
                "dep": "623"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "638",
                "dep": "638"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "649",
                "dep": "650"
            },
            "st54": {
                "track": "2",
                "arr": "655"
            }
        }
    },
    {
        "id": "t14",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "540"
            },
            "st34": {
                "track": "2",
                "arr": "543",
                "dep": "543"
            },
            "st35": {
                "track": "2",
                "arr": "546",
                "dep": "546"
            },
            "st36": {
                "track": "2",
                "arr": "551",
                "dep": "551"
            },
            "st37": {
                "track": "2",
                "arr": "557",
                "dep": "557"
            },
            "st38": {
                "track": "2",
                "arr": "603",
                "dep": "603"
            },
            "st39": {
                "track": "2",
                "arr": "609",
                "dep": "609"
            },
            "st40": {
                "track": "2",
                "arr": "614",
                "dep": "614"
            },
            "st41": {
                "track": "2",
                "arr": "618",
                "dep": "619"
            },
            "st42": {
                "track": "2",
                "arr": "622",
                "dep": "622"
            },
            "st43": {
                "track": "2",
                "arr": "627",
                "dep": "627"
            },
            "st44": {
                "track": "2",
                "arr": "631",
                "dep": "631"
            },
            "st45": {
                "track": "2",
                "arr": "636",
                "dep": "636"
            },
            "st46": {
                "track": "2",
                "arr": "640",
                "dep": "640"
            },
            "st47": {
                "track": "2",
                "arr": "647",
                "dep": "647"
            },
            "st48": {
                "track": "2",
                "arr": "651",
                "dep": "651"
            },
            "st49": {
                "track": "2",
                "arr": "656",
                "dep": "656"
            },
            "st50": {
                "track": "2",
                "arr": "659",
                "dep": "659"
            },
            "st51": {
                "track": "2",
                "arr": "703",
                "dep": "703"
            },
            "st52": {
                "track": "2",
                "arr": "707",
                "dep": "707"
            },
            "st53": {
                "track": "2",
                "arr": "710"
            }
        }
    },
    {
        "id": "t15",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "岸ノ戸",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st41": {
                "track": "2",
                "dep": "633"
            },
            "st42": {
                "track": "2",
                "arr": "636",
                "dep": "636"
            },
            "st43": {
                "track": "2",
                "arr": "641",
                "dep": "641"
            },
            "st44": {
                "track": "2",
                "arr": "645",
                "dep": "645"
            },
            "st45": {
                "track": "2",
                "arr": "650",
                "dep": "655"
            },
            "st46": {
                "track": "2",
                "arr": "659",
                "dep": "659"
            },
            "st47": {
                "track": "2",
                "arr": "706",
                "dep": "706"
            },
            "st48": {
                "track": "2",
                "arr": "710",
                "dep": "710"
            },
            "st49": {
                "track": "2",
                "arr": "715",
                "dep": "715"
            },
            "st50": {
                "track": "2",
                "arr": "718",
                "dep": "718"
            },
            "st51": {
                "track": "2",
                "arr": "722",
                "dep": "722"
            },
            "st52": {
                "track": "2",
                "arr": "726",
                "dep": "726"
            },
            "st53": {
                "track": "2",
                "arr": "729"
            }
        }
    },
    {
        "id": "t16",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "513"
            },
            "st25": {
                "track": "2",
                "arr": "518",
                "dep": "518"
            },
            "st26": {
                "track": "2",
                "arr": "523",
                "dep": "523"
            },
            "st27": {
                "track": "2",
                "arr": "530",
                "dep": "530"
            },
            "st28": {
                "track": "2",
                "arr": "535",
                "dep": "535"
            },
            "st29": {
                "track": "2",
                "arr": "541",
                "dep": "541"
            },
            "st30": {
                "track": "2",
                "arr": "544",
                "dep": "545"
            },
            "st31": {
                "track": "2",
                "arr": "549",
                "dep": "549"
            },
            "st32": {
                "track": "2",
                "arr": "552",
                "dep": "552"
            },
            "st33": {
                "track": "2",
                "arr": "555"
            }
        }
    },
    {
        "id": "t17",
        "trainNo": "3505N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "549"
            },
            "st31": {
                "track": "2",
                "arr": "553",
                "dep": "553"
            },
            "st32": {
                "track": "2",
                "arr": "556",
                "dep": "556"
            },
            "st33": {
                "track": "2",
                "arr": "559",
                "dep": "600"
            },
            "st34": {
                "track": "2",
                "arr": "603",
                "dep": "603"
            },
            "st35": {
                "track": "2",
                "arr": "606",
                "dep": "606"
            },
            "st36": {
                "track": "2",
                "arr": "611",
                "dep": "611"
            },
            "st37": {
                "track": "2",
                "arr": "617",
                "dep": "617"
            },
            "st38": {
                "track": "2",
                "arr": "623",
                "dep": "623"
            },
            "st39": {
                "track": "2",
                "arr": "629",
                "dep": "629"
            },
            "st40": {
                "track": "2",
                "arr": "634",
                "dep": "634"
            },
            "st41": {
                "track": "2",
                "arr": "638",
                "dep": "640"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "646",
                "dep": "646"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "653",
                "dep": "653"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "708",
                "dep": "708"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "719"
            }
        }
    },
    {
        "id": "t18",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "岸ノ戸",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st41": {
                "track": "2",
                "dep": "646"
            },
            "st42": {
                "track": "2",
                "arr": "649",
                "dep": "649"
            },
            "st43": {
                "track": "2",
                "arr": "654",
                "dep": "654"
            },
            "st44": {
                "track": "2",
                "arr": "658",
                "dep": "658"
            },
            "st45": {
                "track": "2",
                "arr": "703",
                "dep": "703"
            },
            "st46": {
                "track": "2",
                "arr": "707",
                "dep": "707"
            },
            "st47": {
                "track": "2",
                "arr": "714",
                "dep": "714"
            },
            "st48": {
                "track": "2",
                "arr": "718",
                "dep": "718"
            },
            "st49": {
                "track": "2",
                "arr": "723",
                "dep": "723"
            },
            "st50": {
                "track": "2",
                "arr": "726",
                "dep": "726"
            },
            "st51": {
                "track": "2",
                "arr": "730",
                "dep": "730"
            },
            "st52": {
                "track": "2",
                "arr": "734",
                "dep": "734"
            },
            "st53": {
                "track": "2",
                "arr": "737"
            }
        }
    },
    {
        "id": "t19",
        "trainNo": "931D",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海一宮",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st21": {
                "track": "1",
                "dep": "517"
            },
            "st22": {
                "track": "2",
                "arr": "523",
                "dep": "523"
            },
            "st23": {
                "track": "2",
                "arr": "531",
                "dep": "531"
            },
            "st24": {
                "track": "2",
                "arr": "535"
            }
        }
    },
    {
        "id": "t20",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "611"
            },
            "st31": {
                "track": "2",
                "arr": "615",
                "dep": "615"
            },
            "st32": {
                "track": "2",
                "arr": "618",
                "dep": "618"
            },
            "st33": {
                "track": "2",
                "arr": "621",
                "dep": "622"
            },
            "st34": {
                "track": "2",
                "arr": "625",
                "dep": "625"
            },
            "st35": {
                "track": "2",
                "arr": "628",
                "dep": "628"
            },
            "st36": {
                "track": "2",
                "arr": "633",
                "dep": "633"
            },
            "st37": {
                "track": "2",
                "arr": "639",
                "dep": "639"
            },
            "st38": {
                "track": "2",
                "arr": "645",
                "dep": "645"
            },
            "st39": {
                "track": "2",
                "arr": "651",
                "dep": "651"
            },
            "st40": {
                "track": "2",
                "arr": "656",
                "dep": "656"
            },
            "st41": {
                "track": "2",
                "arr": "700",
                "dep": "701"
            },
            "st42": {
                "track": "2",
                "arr": "704",
                "dep": "704"
            },
            "st43": {
                "track": "2",
                "arr": "709",
                "dep": "709"
            },
            "st44": {
                "track": "2",
                "arr": "713",
                "dep": "713"
            },
            "st45": {
                "track": "2",
                "arr": "718",
                "dep": "718"
            },
            "st46": {
                "track": "2",
                "arr": "722",
                "dep": "722"
            },
            "st47": {
                "track": "2",
                "arr": "729",
                "dep": "729"
            },
            "st48": {
                "track": "2",
                "arr": "733",
                "dep": "733"
            },
            "st49": {
                "track": "2",
                "arr": "738",
                "dep": "738"
            },
            "st50": {
                "track": "2",
                "arr": "741",
                "dep": "741"
            },
            "st51": {
                "track": "2",
                "arr": "745",
                "dep": "745"
            },
            "st52": {
                "track": "2",
                "arr": "749",
                "dep": "749"
            },
            "st53": {
                "track": "2",
                "arr": "752"
            }
        }
    },
    {
        "id": "t21",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "514"
            },
            "st18": {
                "track": "2",
                "arr": "518",
                "dep": "518"
            },
            "st19": {
                "track": "12通",
                "arr": "524",
                "dep": "524"
            },
            "st20": {
                "track": "2",
                "arr": "530",
                "dep": "530"
            },
            "st21": {
                "track": "1",
                "arr": "535",
                "dep": "536"
            },
            "st22": {
                "track": "2",
                "arr": "542",
                "dep": "542"
            },
            "st23": {
                "track": "2",
                "arr": "550",
                "dep": "550"
            },
            "st24": {
                "track": "2",
                "arr": "554",
                "dep": "555"
            },
            "st25": {
                "track": "2",
                "arr": "600",
                "dep": "600"
            },
            "st26": {
                "track": "2",
                "arr": "605",
                "dep": "605"
            },
            "st27": {
                "track": "2",
                "arr": "612",
                "dep": "612"
            },
            "st28": {
                "track": "2",
                "arr": "617",
                "dep": "617"
            },
            "st29": {
                "track": "2",
                "arr": "623",
                "dep": "623"
            },
            "st30": {
                "track": "2",
                "arr": "626",
                "dep": "627"
            },
            "st31": {
                "track": "2",
                "arr": "631",
                "dep": "631"
            },
            "st32": {
                "track": "2",
                "arr": "634",
                "dep": "634"
            },
            "st33": {
                "track": "2",
                "arr": "637"
            }
        }
    },
    {
        "id": "t22",
        "trainNo": "3509N",
        "duty": "",
        "type": "快速",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "643"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "652",
                "dep": "652"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "707",
                "dep": "707"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "714",
                "dep": "716"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "722",
                "dep": "722"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "729",
                "dep": "729"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "744",
                "dep": "744"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "755"
            }
        }
    },
    {
        "id": "t23",
        "trainNo": "3511D",
        "duty": "",
        "type": "快速",
        "name": "サハラライナー桐屋",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "635"
            },
            "st31": {
                "pass": true
            },
            "st32": {
                "pass": true
            },
            "st33": {
                "track": "2",
                "arr": "643",
                "dep": "647"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "656",
                "dep": "656"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "711",
                "dep": "711"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "718",
                "dep": "719"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "726",
                "dep": "726"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "733",
                "dep": "733"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "748",
                "dep": "748"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "800",
                "dep": "801"
            },
            "st54": {
                "track": "2",
                "arr": "806"
            }
        }
    },
    {
        "id": "t24",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "639"
            },
            "st31": {
                "track": "2",
                "arr": "643",
                "dep": "643"
            },
            "st32": {
                "track": "2",
                "arr": "646",
                "dep": "646"
            },
            "st33": {
                "track": "2",
                "arr": "649",
                "dep": "650"
            },
            "st34": {
                "track": "2",
                "arr": "653",
                "dep": "653"
            },
            "st35": {
                "track": "2",
                "arr": "656",
                "dep": "656"
            },
            "st36": {
                "track": "2",
                "arr": "701",
                "dep": "701"
            },
            "st37": {
                "track": "2",
                "arr": "707",
                "dep": "707"
            },
            "st38": {
                "track": "2",
                "arr": "713",
                "dep": "713"
            },
            "st39": {
                "track": "2",
                "arr": "719",
                "dep": "719"
            },
            "st40": {
                "track": "2",
                "arr": "724",
                "dep": "724"
            },
            "st41": {
                "track": "2",
                "arr": "728",
                "dep": "729"
            },
            "st42": {
                "track": "2",
                "arr": "732",
                "dep": "732"
            },
            "st43": {
                "track": "2",
                "arr": "737",
                "dep": "737"
            },
            "st44": {
                "track": "2",
                "arr": "741",
                "dep": "741"
            },
            "st45": {
                "track": "2",
                "arr": "746",
                "dep": "746"
            },
            "st46": {
                "track": "2",
                "arr": "750",
                "dep": "750"
            },
            "st47": {
                "track": "2",
                "arr": "757",
                "dep": "757"
            },
            "st48": {
                "track": "2",
                "arr": "801",
                "dep": "801"
            },
            "st49": {
                "track": "2",
                "arr": "806",
                "dep": "806"
            },
            "st50": {
                "track": "2",
                "arr": "809",
                "dep": "809"
            },
            "st51": {
                "track": "2",
                "arr": "813",
                "dep": "813"
            },
            "st52": {
                "track": "2",
                "arr": "817",
                "dep": "817"
            },
            "st53": {
                "track": "2",
                "arr": "820"
            }
        }
    },
    {
        "id": "t25",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "510"
            },
            "st15": {
                "track": "2",
                "arr": "515",
                "dep": "515"
            },
            "st16": {
                "track": "2",
                "arr": "520",
                "dep": "520"
            },
            "st17": {
                "track": "2",
                "arr": "523"
            }
        }
    },
    {
        "id": "t26",
        "trainNo": "933D",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "618"
            },
            "st25": {
                "track": "2",
                "arr": "623",
                "dep": "623"
            },
            "st26": {
                "track": "2",
                "arr": "628",
                "dep": "628"
            },
            "st27": {
                "track": "2",
                "arr": "635",
                "dep": "635"
            },
            "st28": {
                "track": "2",
                "arr": "640",
                "dep": "640"
            },
            "st29": {
                "track": "2",
                "arr": "646",
                "dep": "646"
            },
            "st30": {
                "track": "2",
                "arr": "649",
                "dep": "650"
            },
            "st31": {
                "track": "2",
                "arr": "654",
                "dep": "655"
            },
            "st32": {
                "track": "2",
                "arr": "658",
                "dep": "658"
            },
            "st33": {
                "track": "2",
                "arr": "702"
            }
        }
    },
    {
        "id": "t27",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "710"
            },
            "st34": {
                "track": "2",
                "arr": "713",
                "dep": "713"
            },
            "st35": {
                "track": "2",
                "arr": "716",
                "dep": "716"
            },
            "st36": {
                "track": "2",
                "arr": "721",
                "dep": "721"
            },
            "st37": {
                "track": "2",
                "arr": "727",
                "dep": "727"
            },
            "st38": {
                "track": "2",
                "arr": "733",
                "dep": "733"
            },
            "st39": {
                "track": "2",
                "arr": "739",
                "dep": "739"
            },
            "st40": {
                "track": "2",
                "arr": "744",
                "dep": "744"
            },
            "st41": {
                "track": "2",
                "arr": "748",
                "dep": "755"
            },
            "st42": {
                "track": "2",
                "arr": "758",
                "dep": "758"
            },
            "st43": {
                "track": "2",
                "arr": "803",
                "dep": "803"
            },
            "st44": {
                "track": "2",
                "arr": "807",
                "dep": "807"
            },
            "st45": {
                "track": "2",
                "arr": "812",
                "dep": "812"
            },
            "st46": {
                "track": "2",
                "arr": "816",
                "dep": "816"
            },
            "st47": {
                "track": "2",
                "arr": "823",
                "dep": "823"
            },
            "st48": {
                "track": "2",
                "arr": "827",
                "dep": "827"
            },
            "st49": {
                "track": "2",
                "arr": "832",
                "dep": "832"
            },
            "st50": {
                "track": "2",
                "arr": "835",
                "dep": "835"
            },
            "st51": {
                "track": "2",
                "arr": "839",
                "dep": "839"
            },
            "st52": {
                "track": "2",
                "arr": "843",
                "dep": "843"
            },
            "st53": {
                "track": "2",
                "arr": "846"
            }
        }
    },
    {
        "id": "t28",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "533"
            },
            "st13": {
                "track": "2",
                "arr": "540",
                "dep": "540"
            },
            "st14": {
                "track": "2",
                "arr": "546",
                "dep": "546"
            },
            "st15": {
                "track": "2",
                "arr": "551",
                "dep": "551"
            },
            "st16": {
                "track": "2",
                "arr": "556",
                "dep": "556"
            },
            "st17": {
                "track": "2",
                "arr": "559",
                "dep": "600"
            },
            "st18": {
                "track": "2",
                "arr": "604",
                "dep": "604"
            },
            "st19": {
                "track": "12通",
                "arr": "610",
                "dep": "610"
            },
            "st20": {
                "track": "2",
                "arr": "616",
                "dep": "616"
            },
            "st21": {
                "track": "1",
                "arr": "621",
                "dep": "622"
            },
            "st22": {
                "track": "2",
                "arr": "628",
                "dep": "628"
            },
            "st23": {
                "track": "2",
                "arr": "636",
                "dep": "636"
            },
            "st24": {
                "track": "2",
                "arr": "640",
                "dep": "641"
            },
            "st25": {
                "track": "2",
                "arr": "646",
                "dep": "646"
            },
            "st26": {
                "track": "2",
                "arr": "651",
                "dep": "651"
            },
            "st27": {
                "track": "2",
                "arr": "658",
                "dep": "658"
            },
            "st28": {
                "track": "2",
                "arr": "703",
                "dep": "703"
            },
            "st29": {
                "track": "2",
                "arr": "709",
                "dep": "709"
            },
            "st30": {
                "track": "2",
                "arr": "712",
                "dep": "713"
            },
            "st31": {
                "track": "2",
                "arr": "717",
                "dep": "717"
            },
            "st32": {
                "track": "2",
                "arr": "720",
                "dep": "720"
            },
            "st33": {
                "track": "2",
                "arr": "723"
            }
        }
    },
    {
        "id": "t29",
        "trainNo": "1001M",
        "duty": "",
        "type": "特急",
        "name": "竜鹿",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "725"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "733",
                "dep": "733"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "pass": true
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "752",
                "dep": "752"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "pass": true
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "804",
                "dep": "804"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "pass": true
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "826",
                "dep": "827"
            },
            "st54": {
                "track": "2",
                "arr": "832"
            }
        }
    },
    {
        "id": "t30",
        "trainNo": "3505N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "720"
            },
            "st31": {
                "track": "2",
                "arr": "724",
                "dep": "724"
            },
            "st32": {
                "track": "2",
                "arr": "727",
                "dep": "727"
            },
            "st33": {
                "track": "2",
                "arr": "730",
                "dep": "731"
            },
            "st34": {
                "track": "2",
                "arr": "734",
                "dep": "734"
            },
            "st35": {
                "track": "2",
                "arr": "737",
                "dep": "737"
            },
            "st36": {
                "track": "2",
                "arr": "742",
                "dep": "742"
            },
            "st37": {
                "track": "2",
                "arr": "748",
                "dep": "748"
            },
            "st38": {
                "track": "2",
                "arr": "754",
                "dep": "754"
            },
            "st39": {
                "track": "2",
                "arr": "800",
                "dep": "800"
            },
            "st40": {
                "track": "2",
                "arr": "805",
                "dep": "805"
            },
            "st41": {
                "track": "2",
                "arr": "809",
                "dep": "811"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "817",
                "dep": "817"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "824",
                "dep": "824"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "839",
                "dep": "839"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "850",
                "dep": "851"
            },
            "st54": {
                "track": "2",
                "arr": "856"
            }
        }
    },
    {
        "id": "t31",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "615"
            },
            "st18": {
                "track": "2",
                "arr": "619",
                "dep": "619"
            },
            "st19": {
                "track": "12通",
                "arr": "625",
                "dep": "625"
            },
            "st20": {
                "track": "2",
                "arr": "631",
                "dep": "631"
            },
            "st21": {
                "track": "1",
                "arr": "636",
                "dep": "637"
            },
            "st22": {
                "track": "2",
                "arr": "643",
                "dep": "643"
            },
            "st23": {
                "track": "2",
                "arr": "651",
                "dep": "651"
            },
            "st24": {
                "track": "2",
                "arr": "655"
            }
        }
    },
    {
        "id": "t32",
        "trainNo": "",
        "duty": "",
        "type": "快速",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "500"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "track": "12通",
                "arr": "506",
                "dep": "506"
            },
            "st3": {
                "track": "2",
                "arr": "512",
                "dep": "512"
            },
            "st4": {
                "track": "2",
                "arr": "517",
                "dep": "517"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "527",
                "dep": "527"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "537"
            }
        }
    },
    {
        "id": "t33",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "630"
            },
            "st18": {
                "track": "2",
                "arr": "634",
                "dep": "634"
            },
            "st19": {
                "track": "12通",
                "arr": "640",
                "dep": "640"
            },
            "st20": {
                "track": "2",
                "arr": "646",
                "dep": "646"
            },
            "st21": {
                "track": "1",
                "arr": "651",
                "dep": "652"
            },
            "st22": {
                "track": "2",
                "arr": "658",
                "dep": "658"
            },
            "st23": {
                "track": "2",
                "arr": "706",
                "dep": "706"
            },
            "st24": {
                "track": "2",
                "arr": "710",
                "dep": "711"
            },
            "st25": {
                "track": "2",
                "arr": "716",
                "dep": "716"
            },
            "st26": {
                "track": "2",
                "arr": "721",
                "dep": "721"
            },
            "st27": {
                "track": "2",
                "arr": "728",
                "dep": "728"
            },
            "st28": {
                "track": "2",
                "arr": "733",
                "dep": "733"
            },
            "st29": {
                "track": "2",
                "arr": "739",
                "dep": "739"
            },
            "st30": {
                "track": "2",
                "arr": "742",
                "dep": "743"
            },
            "st31": {
                "track": "2",
                "arr": "747",
                "dep": "747"
            },
            "st32": {
                "track": "2",
                "arr": "750",
                "dep": "750"
            },
            "st33": {
                "track": "2",
                "arr": "753"
            }
        }
    },
    {
        "id": "t34",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "桐屋本町",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "617"
            },
            "st15": {
                "track": "2",
                "arr": "622",
                "dep": "622"
            },
            "st16": {
                "track": "2",
                "arr": "627",
                "dep": "627"
            },
            "st17": {
                "track": "2",
                "arr": "630",
                "dep": "645"
            },
            "st18": {
                "track": "2",
                "arr": "649",
                "dep": "649"
            },
            "st19": {
                "track": "12通",
                "arr": "655",
                "dep": "655"
            },
            "st20": {
                "track": "2",
                "arr": "701",
                "dep": "701"
            },
            "st21": {
                "track": "1",
                "arr": "706",
                "dep": "707"
            },
            "st22": {
                "track": "2",
                "arr": "713",
                "dep": "713"
            },
            "st23": {
                "track": "2",
                "arr": "721",
                "dep": "721"
            },
            "st24": {
                "track": "2",
                "arr": "725",
                "dep": "728"
            },
            "st25": {
                "track": "2",
                "arr": "733",
                "dep": "733"
            },
            "st26": {
                "track": "2",
                "arr": "738",
                "dep": "738"
            },
            "st27": {
                "track": "2",
                "arr": "745",
                "dep": "745"
            },
            "st28": {
                "track": "2",
                "arr": "750",
                "dep": "750"
            },
            "st29": {
                "track": "2",
                "arr": "756",
                "dep": "756"
            },
            "st30": {
                "track": "2",
                "arr": "759"
            }
        }
    },
    {
        "id": "t35",
        "trainNo": "3505N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "803"
            },
            "st31": {
                "track": "2",
                "arr": "807",
                "dep": "807"
            },
            "st32": {
                "track": "2",
                "arr": "810",
                "dep": "810"
            },
            "st33": {
                "track": "2",
                "arr": "813",
                "dep": "814"
            },
            "st34": {
                "track": "2",
                "arr": "817",
                "dep": "817"
            },
            "st35": {
                "track": "2",
                "arr": "820",
                "dep": "820"
            },
            "st36": {
                "track": "2",
                "arr": "825",
                "dep": "825"
            },
            "st37": {
                "track": "2",
                "arr": "831",
                "dep": "831"
            },
            "st38": {
                "track": "2",
                "arr": "837",
                "dep": "837"
            },
            "st39": {
                "track": "2",
                "arr": "843",
                "dep": "843"
            },
            "st40": {
                "track": "2",
                "arr": "848",
                "dep": "848"
            },
            "st41": {
                "track": "2",
                "arr": "852",
                "dep": "854"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "900",
                "dep": "900"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "907",
                "dep": "907"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "922",
                "dep": "922"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "933"
            }
        }
    },
    {
        "id": "t36",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "511"
            },
            "st1": {
                "track": "2",
                "arr": "515",
                "dep": "515"
            },
            "st2": {
                "track": "12通",
                "arr": "520",
                "dep": "520"
            },
            "st3": {
                "track": "2",
                "arr": "526",
                "dep": "526"
            },
            "st4": {
                "track": "2",
                "arr": "531",
                "dep": "531"
            },
            "st5": {
                "track": "2",
                "arr": "534",
                "dep": "534"
            },
            "st6": {
                "track": "2",
                "arr": "540",
                "dep": "540"
            },
            "st7": {
                "track": "2",
                "arr": "545",
                "dep": "545"
            },
            "st8": {
                "track": "2",
                "arr": "552",
                "dep": "552"
            },
            "st9": {
                "track": "2",
                "arr": "558",
                "dep": "558"
            },
            "st10": {
                "track": "2",
                "arr": "609",
                "dep": "609"
            },
            "st11": {
                "track": "2通",
                "arr": "621",
                "dep": "621"
            },
            "st12": {
                "track": "2",
                "arr": "630",
                "dep": "630"
            },
            "st13": {
                "track": "2",
                "arr": "637",
                "dep": "637"
            },
            "st14": {
                "track": "2",
                "arr": "643",
                "dep": "643"
            },
            "st15": {
                "track": "2",
                "arr": "648",
                "dep": "648"
            },
            "st16": {
                "track": "2",
                "arr": "653",
                "dep": "653"
            },
            "st17": {
                "track": "2",
                "arr": "656"
            }
        }
    },
    {
        "id": "t37",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "705"
            },
            "st18": {
                "track": "2",
                "arr": "709",
                "dep": "709"
            },
            "st19": {
                "track": "12通",
                "arr": "715",
                "dep": "715"
            },
            "st20": {
                "track": "2",
                "arr": "721",
                "dep": "721"
            },
            "st21": {
                "track": "1",
                "arr": "726",
                "dep": "727"
            },
            "st22": {
                "track": "2",
                "arr": "733",
                "dep": "733"
            },
            "st23": {
                "track": "2",
                "arr": "741",
                "dep": "741"
            },
            "st24": {
                "track": "2",
                "arr": "745"
            }
        }
    },
    {
        "id": "t38",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "704"
            },
            "st15": {
                "track": "2",
                "arr": "709",
                "dep": "709"
            },
            "st16": {
                "track": "2",
                "arr": "714",
                "dep": "714"
            },
            "st17": {
                "track": "2",
                "arr": "717"
            }
        }
    },
    {
        "id": "t39",
        "trainNo": "",
        "duty": "",
        "type": "快速",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "718"
            },
            "st18": {
                "pass": true
            },
            "st19": {
                "track": "12通",
                "arr": "726",
                "dep": "726"
            },
            "st20": {
                "pass": true
            },
            "st21": {
                "track": "1",
                "arr": "735",
                "dep": "736"
            },
            "st22": {
                "pass": true
            },
            "st23": {
                "pass": true
            },
            "st24": {
                "track": "2",
                "arr": "748"
            }
        }
    },
    {
        "id": "t40",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "750"
            },
            "st25": {
                "track": "2",
                "arr": "755",
                "dep": "755"
            },
            "st26": {
                "track": "2",
                "arr": "800",
                "dep": "800"
            },
            "st27": {
                "track": "2",
                "arr": "807",
                "dep": "807"
            },
            "st28": {
                "track": "2",
                "arr": "812",
                "dep": "812"
            },
            "st29": {
                "track": "2",
                "arr": "818",
                "dep": "818"
            },
            "st30": {
                "track": "2",
                "arr": "821",
                "dep": "822"
            },
            "st31": {
                "track": "2",
                "arr": "826",
                "dep": "826"
            },
            "st32": {
                "track": "2",
                "arr": "829",
                "dep": "829"
            },
            "st33": {
                "track": "2",
                "arr": "832"
            }
        }
    },
    {
        "id": "t41",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "733"
            },
            "st18": {
                "track": "2",
                "arr": "737",
                "dep": "737"
            },
            "st19": {
                "track": "12通",
                "arr": "743",
                "dep": "743"
            },
            "st20": {
                "track": "2",
                "arr": "749",
                "dep": "749"
            },
            "st21": {
                "track": "1",
                "arr": "754",
                "dep": "755"
            },
            "st22": {
                "track": "2",
                "arr": "801",
                "dep": "801"
            },
            "st23": {
                "track": "2",
                "arr": "809",
                "dep": "809"
            },
            "st24": {
                "track": "2",
                "arr": "813",
                "dep": "815"
            },
            "st25": {
                "track": "2",
                "arr": "820",
                "dep": "820"
            },
            "st26": {
                "track": "2",
                "arr": "825",
                "dep": "825"
            },
            "st27": {
                "track": "2",
                "arr": "832",
                "dep": "832"
            },
            "st28": {
                "track": "2",
                "arr": "837",
                "dep": "837"
            },
            "st29": {
                "track": "2",
                "arr": "843",
                "dep": "843"
            },
            "st30": {
                "track": "2",
                "arr": "846",
                "dep": "847"
            },
            "st31": {
                "track": "2",
                "arr": "851",
                "dep": "851"
            },
            "st32": {
                "track": "2",
                "arr": "854",
                "dep": "854"
            },
            "st33": {
                "track": "2",
                "arr": "857"
            }
        }
    },
    {
        "id": "t42",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "昼川温泉",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st9": {
                "track": "2",
                "dep": "640"
            },
            "st10": {
                "track": "2",
                "arr": "651",
                "dep": "651"
            },
            "st11": {
                "track": "2通",
                "arr": "703",
                "dep": "703"
            },
            "st12": {
                "track": "2",
                "arr": "712",
                "dep": "712"
            },
            "st13": {
                "track": "2",
                "arr": "719",
                "dep": "719"
            },
            "st14": {
                "track": "2",
                "arr": "725",
                "dep": "725"
            },
            "st15": {
                "track": "2",
                "arr": "730",
                "dep": "730"
            },
            "st16": {
                "track": "2",
                "arr": "735",
                "dep": "735"
            },
            "st17": {
                "track": "2",
                "arr": "738"
            }
        }
    },
    {
        "id": "t43",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "600"
            },
            "st1": {
                "track": "2",
                "arr": "604",
                "dep": "604"
            },
            "st2": {
                "track": "12通",
                "arr": "609",
                "dep": "609"
            },
            "st3": {
                "track": "2",
                "arr": "615",
                "dep": "615"
            },
            "st4": {
                "track": "2",
                "arr": "620",
                "dep": "620"
            },
            "st5": {
                "track": "2",
                "arr": "623",
                "dep": "623"
            },
            "st6": {
                "track": "2",
                "arr": "629",
                "dep": "629"
            },
            "st7": {
                "track": "2",
                "arr": "634",
                "dep": "634"
            },
            "st8": {
                "track": "2",
                "arr": "641",
                "dep": "641"
            },
            "st9": {
                "track": "2",
                "arr": "647"
            }
        }
    },
    {
        "id": "t44",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "757"
            },
            "st18": {
                "track": "2",
                "arr": "801",
                "dep": "801"
            },
            "st19": {
                "track": "12通",
                "arr": "807",
                "dep": "807"
            },
            "st20": {
                "track": "2",
                "arr": "813",
                "dep": "813"
            },
            "st21": {
                "track": "1",
                "arr": "818",
                "dep": "819"
            },
            "st22": {
                "track": "2",
                "arr": "825",
                "dep": "825"
            },
            "st23": {
                "track": "2",
                "arr": "833",
                "dep": "833"
            },
            "st24": {
                "track": "2",
                "arr": "837",
                "dep": "838"
            },
            "st25": {
                "track": "2",
                "arr": "843",
                "dep": "843"
            },
            "st26": {
                "track": "2",
                "arr": "848",
                "dep": "848"
            },
            "st27": {
                "track": "2",
                "arr": "855",
                "dep": "855"
            },
            "st28": {
                "track": "2",
                "arr": "900",
                "dep": "900"
            },
            "st29": {
                "track": "2",
                "arr": "906",
                "dep": "906"
            },
            "st30": {
                "track": "2",
                "arr": "909",
                "dep": "910"
            },
            "st31": {
                "track": "2",
                "arr": "914",
                "dep": "914"
            },
            "st32": {
                "track": "2",
                "arr": "917",
                "dep": "917"
            },
            "st33": {
                "track": "2",
                "arr": "920"
            }
        }
    },
    {
        "id": "t45",
        "trainNo": "3505N",
        "duty": "",
        "type": "快速",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "937"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "946",
                "dep": "946"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "1001",
                "dep": "1001"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "1008",
                "dep": "1010"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1016",
                "dep": "1016"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1023",
                "dep": "1023"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1038",
                "dep": "1038"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1049",
                "dep": "1050"
            },
            "st54": {
                "track": "2",
                "arr": "1055"
            }
        }
    },
    {
        "id": "t46",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "734"
            },
            "st13": {
                "track": "2",
                "arr": "741",
                "dep": "741"
            },
            "st14": {
                "track": "2",
                "arr": "747",
                "dep": "747"
            },
            "st15": {
                "track": "2",
                "arr": "752",
                "dep": "752"
            },
            "st16": {
                "track": "2",
                "arr": "757",
                "dep": "757"
            },
            "st17": {
                "track": "2",
                "arr": "800"
            }
        }
    },
    {
        "id": "t47",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "820"
            },
            "st18": {
                "track": "2",
                "arr": "824",
                "dep": "824"
            },
            "st19": {
                "track": "12通",
                "arr": "830",
                "dep": "830"
            },
            "st20": {
                "track": "2",
                "arr": "836",
                "dep": "836"
            },
            "st21": {
                "track": "1",
                "arr": "841",
                "dep": "842"
            },
            "st22": {
                "track": "2",
                "arr": "848",
                "dep": "848"
            },
            "st23": {
                "track": "2",
                "arr": "856",
                "dep": "856"
            },
            "st24": {
                "track": "2",
                "arr": "900",
                "dep": "901"
            },
            "st25": {
                "track": "2",
                "arr": "906",
                "dep": "906"
            },
            "st26": {
                "track": "2",
                "arr": "911",
                "dep": "911"
            },
            "st27": {
                "track": "2",
                "arr": "918",
                "dep": "918"
            },
            "st28": {
                "track": "2",
                "arr": "923",
                "dep": "923"
            },
            "st29": {
                "track": "2",
                "arr": "929",
                "dep": "929"
            },
            "st30": {
                "track": "2",
                "arr": "932",
                "dep": "933"
            },
            "st31": {
                "track": "2",
                "arr": "937",
                "dep": "937"
            },
            "st32": {
                "track": "2",
                "arr": "940",
                "dep": "940"
            },
            "st33": {
                "track": "2",
                "arr": "943"
            }
        }
    },
    {
        "id": "t48",
        "trainNo": "3515D",
        "duty": "",
        "type": "快速",
        "name": "サハラライナー桐屋",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "947"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "956",
                "dep": "956"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "1011",
                "dep": "1011"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "1018",
                "dep": "1019"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1026",
                "dep": "1026"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1033",
                "dep": "1033"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1048",
                "dep": "1048"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1100",
                "dep": "1101"
            },
            "st54": {
                "track": "2",
                "arr": "1106"
            }
        }
    },
    {
        "id": "t49",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "810"
            },
            "st15": {
                "track": "2",
                "arr": "815",
                "dep": "815"
            },
            "st16": {
                "track": "2",
                "arr": "820",
                "dep": "820"
            },
            "st17": {
                "track": "2",
                "arr": "823"
            }
        }
    },
    {
        "id": "t50",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "630"
            },
            "st1": {
                "track": "2",
                "arr": "634",
                "dep": "634"
            },
            "st2": {
                "track": "12通",
                "arr": "639",
                "dep": "639"
            },
            "st3": {
                "track": "2",
                "arr": "645",
                "dep": "645"
            },
            "st4": {
                "track": "2",
                "arr": "650"
            }
        }
    },
    {
        "id": "t51",
        "trainNo": "",
        "duty": "",
        "type": "回送",
        "name": "",
        "startStation": "室川福田",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st1": {
                "track": "2",
                "dep": "640"
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "654"
            }
        }
    },
    {
        "id": "t52",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "楠手",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st4": {
                "track": "2",
                "dep": "656"
            },
            "st5": {
                "track": "2",
                "arr": "659",
                "dep": "659"
            },
            "st6": {
                "track": "2",
                "arr": "705",
                "dep": "705"
            },
            "st7": {
                "track": "2",
                "arr": "710",
                "dep": "710"
            },
            "st8": {
                "track": "2",
                "arr": "717",
                "dep": "717"
            },
            "st9": {
                "track": "2",
                "arr": "723"
            }
        }
    },
    {
        "id": "t53",
        "trainNo": "3503N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1000"
            },
            "st34": {
                "track": "2",
                "arr": "1003",
                "dep": "1003"
            },
            "st35": {
                "track": "2",
                "arr": "1006",
                "dep": "1006"
            },
            "st36": {
                "track": "2",
                "arr": "1011",
                "dep": "1011"
            },
            "st37": {
                "track": "2",
                "arr": "1017",
                "dep": "1017"
            },
            "st38": {
                "track": "2",
                "arr": "1023",
                "dep": "1023"
            },
            "st39": {
                "track": "2",
                "arr": "1029",
                "dep": "1029"
            },
            "st40": {
                "track": "2",
                "arr": "1034",
                "dep": "1034"
            },
            "st41": {
                "track": "2",
                "arr": "1038",
                "dep": "1040"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1046",
                "dep": "1046"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1053",
                "dep": "1053"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1108",
                "dep": "1108"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1119",
                "dep": "1120"
            },
            "st54": {
                "track": "2",
                "arr": "1125"
            }
        }
    },
    {
        "id": "t54",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "700"
            },
            "st1": {
                "track": "2",
                "arr": "704",
                "dep": "704"
            },
            "st2": {
                "track": "12通",
                "arr": "709",
                "dep": "709"
            },
            "st3": {
                "track": "2",
                "arr": "715",
                "dep": "715"
            },
            "st4": {
                "track": "2",
                "arr": "720",
                "dep": "720"
            },
            "st5": {
                "track": "2",
                "arr": "723",
                "dep": "723"
            },
            "st6": {
                "track": "2",
                "arr": "729",
                "dep": "729"
            },
            "st7": {
                "track": "2",
                "arr": "734",
                "dep": "734"
            },
            "st8": {
                "track": "2",
                "arr": "741",
                "dep": "741"
            },
            "st9": {
                "track": "2",
                "arr": "747",
                "dep": "747"
            },
            "st10": {
                "track": "2",
                "arr": "758",
                "dep": "758"
            },
            "st11": {
                "track": "2通",
                "arr": "810",
                "dep": "810"
            },
            "st12": {
                "track": "2",
                "arr": "819",
                "dep": "819"
            },
            "st13": {
                "track": "2",
                "arr": "826",
                "dep": "826"
            },
            "st14": {
                "track": "2",
                "arr": "832",
                "dep": "832"
            },
            "st15": {
                "track": "2",
                "arr": "837",
                "dep": "837"
            },
            "st16": {
                "track": "2",
                "arr": "842",
                "dep": "842"
            },
            "st17": {
                "track": "2",
                "arr": "845"
            }
        }
    },
    {
        "id": "t55",
        "trainNo": "",
        "duty": "",
        "type": "回送",
        "name": "",
        "startStation": "横賀",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st7": {
                "track": "2",
                "dep": "817"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "828"
            }
        }
    },
    {
        "id": "t56",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "848"
            },
            "st18": {
                "track": "2",
                "arr": "852",
                "dep": "852"
            },
            "st19": {
                "track": "12通",
                "arr": "858",
                "dep": "858"
            },
            "st20": {
                "track": "2",
                "arr": "904",
                "dep": "904"
            },
            "st21": {
                "track": "1",
                "arr": "909",
                "dep": "910"
            },
            "st22": {
                "track": "2",
                "arr": "916",
                "dep": "916"
            },
            "st23": {
                "track": "2",
                "arr": "924",
                "dep": "924"
            },
            "st24": {
                "track": "2",
                "arr": "928",
                "dep": "929"
            },
            "st25": {
                "track": "2",
                "arr": "934",
                "dep": "934"
            },
            "st26": {
                "track": "2",
                "arr": "939",
                "dep": "939"
            },
            "st27": {
                "track": "2",
                "arr": "946",
                "dep": "946"
            },
            "st28": {
                "track": "2",
                "arr": "951",
                "dep": "951"
            },
            "st29": {
                "track": "2",
                "arr": "957",
                "dep": "957"
            },
            "st30": {
                "track": "2",
                "arr": "1000",
                "dep": "1001"
            },
            "st31": {
                "track": "2",
                "arr": "1005",
                "dep": "1005"
            },
            "st32": {
                "track": "2",
                "arr": "1008",
                "dep": "1008"
            },
            "st33": {
                "track": "2",
                "arr": "1011"
            }
        }
    },
    {
        "id": "t57",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "横賀",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "724"
            },
            "st1": {
                "track": "2",
                "arr": "728",
                "dep": "728"
            },
            "st2": {
                "track": "12通",
                "arr": "733",
                "dep": "733"
            },
            "st3": {
                "track": "2",
                "arr": "739",
                "dep": "739"
            },
            "st4": {
                "track": "2",
                "arr": "744",
                "dep": "744"
            },
            "st5": {
                "track": "2",
                "arr": "747",
                "dep": "747"
            },
            "st6": {
                "track": "2",
                "arr": "753",
                "dep": "753"
            },
            "st7": {
                "track": "2",
                "arr": "758"
            }
        }
    },
    {
        "id": "t58",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "淡海一宮",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "845"
            },
            "st13": {
                "track": "2",
                "arr": "851",
                "dep": "852"
            },
            "st14": {
                "track": "2",
                "arr": "857",
                "dep": "858"
            },
            "st15": {
                "track": "2",
                "arr": "902",
                "dep": "903"
            },
            "st16": {
                "track": "2",
                "arr": "907",
                "dep": "908"
            },
            "st17": {
                "track": "2",
                "arr": "911",
                "dep": "912"
            },
            "st18": {
                "track": "2",
                "arr": "916",
                "dep": "917"
            },
            "st19": {
                "track": "12通",
                "arr": "922",
                "dep": "923"
            },
            "st20": {
                "track": "2",
                "arr": "928",
                "dep": "929"
            },
            "st21": {
                "track": "1",
                "arr": "933"
            }
        }
    },
    {
        "id": "t59",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "1020"
            },
            "st31": {
                "track": "2",
                "arr": "1024",
                "dep": "1024"
            },
            "st32": {
                "track": "2",
                "arr": "1027",
                "dep": "1027"
            },
            "st33": {
                "track": "2",
                "arr": "1030"
            }
        }
    },
    {
        "id": "t60",
        "trainNo": "3505N",
        "duty": "",
        "type": "快速",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1037"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "1046",
                "dep": "1046"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "1101",
                "dep": "1101"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "1108",
                "dep": "1110"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1116",
                "dep": "1116"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1123",
                "dep": "1123"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1138",
                "dep": "1138"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1149",
                "dep": "1150"
            },
            "st54": {
                "track": "2",
                "arr": "1155"
            }
        }
    },
    {
        "id": "t61",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "横賀",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "745"
            },
            "st1": {
                "track": "2",
                "arr": "749",
                "dep": "749"
            },
            "st2": {
                "track": "12通",
                "arr": "754",
                "dep": "754"
            },
            "st3": {
                "track": "2",
                "arr": "800",
                "dep": "800"
            },
            "st4": {
                "track": "2",
                "arr": "805",
                "dep": "805"
            },
            "st5": {
                "track": "2",
                "arr": "808",
                "dep": "808"
            },
            "st6": {
                "track": "2",
                "arr": "814",
                "dep": "814"
            },
            "st7": {
                "track": "2",
                "arr": "819"
            }
        }
    },
    {
        "id": "t62",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "925"
            },
            "st18": {
                "track": "2",
                "arr": "929",
                "dep": "929"
            },
            "st19": {
                "track": "12通",
                "arr": "935",
                "dep": "935"
            },
            "st20": {
                "track": "2",
                "arr": "941",
                "dep": "941"
            },
            "st21": {
                "track": "1",
                "arr": "946",
                "dep": "947"
            },
            "st22": {
                "track": "2",
                "arr": "953",
                "dep": "953"
            },
            "st23": {
                "track": "2",
                "arr": "1001",
                "dep": "1001"
            },
            "st24": {
                "track": "2",
                "arr": "1005",
                "dep": "1006"
            },
            "st25": {
                "track": "2",
                "arr": "1011",
                "dep": "1011"
            },
            "st26": {
                "track": "2",
                "arr": "1016",
                "dep": "1016"
            },
            "st27": {
                "track": "2",
                "arr": "1023",
                "dep": "1023"
            },
            "st28": {
                "track": "2",
                "arr": "1028",
                "dep": "1028"
            },
            "st29": {
                "track": "2",
                "arr": "1034",
                "dep": "1034"
            },
            "st30": {
                "track": "2",
                "arr": "1037",
                "dep": "1038"
            },
            "st31": {
                "track": "2",
                "arr": "1042",
                "dep": "1042"
            },
            "st32": {
                "track": "2",
                "arr": "1045",
                "dep": "1045"
            },
            "st33": {
                "track": "2",
                "arr": "1048"
            }
        }
    },
    {
        "id": "t63",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "917"
            },
            "st15": {
                "track": "2",
                "arr": "922",
                "dep": "922"
            },
            "st16": {
                "track": "2",
                "arr": "927",
                "dep": "927"
            },
            "st17": {
                "track": "2",
                "arr": "930"
            }
        }
    },
    {
        "id": "t64",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "942"
            },
            "st18": {
                "track": "2",
                "arr": "946",
                "dep": "946"
            },
            "st19": {
                "track": "12通",
                "arr": "952",
                "dep": "952"
            },
            "st20": {
                "track": "2",
                "arr": "958",
                "dep": "958"
            },
            "st21": {
                "track": "1",
                "arr": "1003",
                "dep": "1004"
            },
            "st22": {
                "track": "2",
                "arr": "1010",
                "dep": "1010"
            },
            "st23": {
                "track": "2",
                "arr": "1018",
                "dep": "1018"
            },
            "st24": {
                "track": "2",
                "arr": "1022"
            }
        }
    },
    {
        "id": "t65",
        "trainNo": "3503N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1100"
            },
            "st34": {
                "track": "2",
                "arr": "1103",
                "dep": "1103"
            },
            "st35": {
                "track": "2",
                "arr": "1106",
                "dep": "1106"
            },
            "st36": {
                "track": "2",
                "arr": "1111",
                "dep": "1111"
            },
            "st37": {
                "track": "2",
                "arr": "1117",
                "dep": "1117"
            },
            "st38": {
                "track": "2",
                "arr": "1123",
                "dep": "1123"
            },
            "st39": {
                "track": "2",
                "arr": "1129",
                "dep": "1129"
            },
            "st40": {
                "track": "2",
                "arr": "1134",
                "dep": "1134"
            },
            "st41": {
                "track": "2",
                "arr": "1138",
                "dep": "1140"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1146",
                "dep": "1146"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1153",
                "dep": "1153"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1208",
                "dep": "1208"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1219",
                "dep": "1220"
            },
            "st54": {
                "track": "2",
                "arr": "1225"
            }
        }
    },
    {
        "id": "t66",
        "trainNo": "",
        "duty": "",
        "type": "快速",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "819"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "track": "12通",
                "arr": "826",
                "dep": "826"
            },
            "st3": {
                "track": "2",
                "arr": "832",
                "dep": "832"
            },
            "st4": {
                "track": "2",
                "arr": "837",
                "dep": "837"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "848",
                "dep": "848"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "859",
                "dep": "859"
            },
            "st10": {
                "track": "2",
                "arr": "910",
                "dep": "910"
            },
            "st11": {
                "pass": true
            },
            "st12": {
                "track": "2",
                "arr": "927",
                "dep": "927"
            },
            "st13": {
                "track": "2",
                "arr": "934",
                "dep": "934"
            },
            "st14": {
                "track": "2",
                "arr": "940",
                "dep": "940"
            },
            "st15": {
                "track": "2",
                "arr": "945",
                "dep": "945"
            },
            "st16": {
                "track": "2",
                "arr": "950",
                "dep": "950"
            },
            "st17": {
                "track": "2",
                "arr": "953"
            }
        }
    },
    {
        "id": "t67",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "淡海一宮",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "956"
            },
            "st18": {
                "track": "2",
                "arr": "1000",
                "dep": "1001"
            },
            "st19": {
                "track": "12通",
                "arr": "1006",
                "dep": "1007"
            },
            "st20": {
                "track": "2",
                "arr": "1012",
                "dep": "1013"
            },
            "st21": {
                "track": "1",
                "arr": "1017"
            }
        }
    },
    {
        "id": "t68",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "901"
            },
            "st1": {
                "track": "2",
                "arr": "905",
                "dep": "905"
            },
            "st2": {
                "track": "12通",
                "arr": "910",
                "dep": "910"
            },
            "st3": {
                "track": "2",
                "arr": "916",
                "dep": "916"
            },
            "st4": {
                "track": "2",
                "arr": "921",
                "dep": "921"
            },
            "st5": {
                "track": "2",
                "arr": "924",
                "dep": "924"
            },
            "st6": {
                "track": "2",
                "arr": "930",
                "dep": "930"
            },
            "st7": {
                "track": "2",
                "arr": "935",
                "dep": "935"
            },
            "st8": {
                "track": "2",
                "arr": "942",
                "dep": "942"
            },
            "st9": {
                "track": "2",
                "arr": "948"
            }
        }
    },
    {
        "id": "t69",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "1109"
            },
            "st31": {
                "track": "2",
                "arr": "1113",
                "dep": "1113"
            },
            "st32": {
                "track": "2",
                "arr": "1116",
                "dep": "1116"
            },
            "st33": {
                "track": "2",
                "arr": "1119"
            }
        }
    },
    {
        "id": "t70",
        "trainNo": "3505N",
        "duty": "",
        "type": "快速",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1137"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "1146",
                "dep": "1146"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "1201",
                "dep": "1201"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "1208",
                "dep": "1210"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1216",
                "dep": "1216"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1223",
                "dep": "1223"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1238",
                "dep": "1238"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1249",
                "dep": "1250"
            },
            "st54": {
                "track": "2",
                "arr": "1255"
            }
        }
    },
    {
        "id": "t71",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "950"
            },
            "st13": {
                "track": "2",
                "arr": "957",
                "dep": "957"
            },
            "st14": {
                "track": "2",
                "arr": "1003",
                "dep": "1003"
            },
            "st15": {
                "track": "2",
                "arr": "1008",
                "dep": "1008"
            },
            "st16": {
                "track": "2",
                "arr": "1013",
                "dep": "1013"
            },
            "st17": {
                "track": "2",
                "arr": "1016"
            }
        }
    },
    {
        "id": "t72",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1022"
            },
            "st18": {
                "track": "2",
                "arr": "1026",
                "dep": "1026"
            },
            "st19": {
                "track": "12通",
                "arr": "1032",
                "dep": "1032"
            },
            "st20": {
                "track": "2",
                "arr": "1038",
                "dep": "1038"
            },
            "st21": {
                "track": "1",
                "arr": "1043",
                "dep": "1044"
            },
            "st22": {
                "track": "2",
                "arr": "1050",
                "dep": "1050"
            },
            "st23": {
                "track": "2",
                "arr": "1058",
                "dep": "1058"
            },
            "st24": {
                "track": "2",
                "arr": "1102",
                "dep": "1105"
            },
            "st25": {
                "track": "2",
                "arr": "1110",
                "dep": "1110"
            },
            "st26": {
                "track": "2",
                "arr": "1115",
                "dep": "1115"
            },
            "st27": {
                "track": "2",
                "arr": "1122",
                "dep": "1122"
            },
            "st28": {
                "track": "2",
                "arr": "1127",
                "dep": "1127"
            },
            "st29": {
                "track": "2",
                "arr": "1133",
                "dep": "1133"
            },
            "st30": {
                "track": "2",
                "arr": "1136",
                "dep": "1137"
            },
            "st31": {
                "track": "2",
                "arr": "1141",
                "dep": "1141"
            },
            "st32": {
                "track": "2",
                "arr": "1144",
                "dep": "1144"
            },
            "st33": {
                "track": "2",
                "arr": "1147"
            }
        }
    },
    {
        "id": "t73",
        "trainNo": "3503N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1200"
            },
            "st34": {
                "track": "2",
                "arr": "1203",
                "dep": "1203"
            },
            "st35": {
                "track": "2",
                "arr": "1206",
                "dep": "1206"
            },
            "st36": {
                "track": "2",
                "arr": "1211",
                "dep": "1211"
            },
            "st37": {
                "track": "2",
                "arr": "1217",
                "dep": "1217"
            },
            "st38": {
                "track": "2",
                "arr": "1223",
                "dep": "1223"
            },
            "st39": {
                "track": "2",
                "arr": "1229",
                "dep": "1229"
            },
            "st40": {
                "track": "2",
                "arr": "1234",
                "dep": "1234"
            },
            "st41": {
                "track": "2",
                "arr": "1238",
                "dep": "1240"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1246",
                "dep": "1246"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1253",
                "dep": "1253"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1308",
                "dep": "1308"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1319",
                "dep": "1320"
            },
            "st54": {
                "track": "2",
                "arr": "1325"
            }
        }
    },
    {
        "id": "t74",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "928"
            },
            "st1": {
                "track": "2",
                "arr": "932",
                "dep": "932"
            },
            "st2": {
                "track": "12通",
                "arr": "937",
                "dep": "937"
            },
            "st3": {
                "track": "2",
                "arr": "943",
                "dep": "943"
            },
            "st4": {
                "track": "2",
                "arr": "948"
            }
        }
    },
    {
        "id": "t75",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "1159"
            },
            "st31": {
                "track": "2",
                "arr": "1203",
                "dep": "1203"
            },
            "st32": {
                "track": "2",
                "arr": "1206",
                "dep": "1206"
            },
            "st33": {
                "track": "2",
                "arr": "1209"
            }
        }
    },
    {
        "id": "t76",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1052"
            },
            "st18": {
                "track": "2",
                "arr": "1056",
                "dep": "1056"
            },
            "st19": {
                "track": "12通",
                "arr": "1102",
                "dep": "1102"
            },
            "st20": {
                "track": "2",
                "arr": "1108",
                "dep": "1108"
            },
            "st21": {
                "track": "1",
                "arr": "1113",
                "dep": "1114"
            },
            "st22": {
                "track": "2",
                "arr": "1120",
                "dep": "1120"
            },
            "st23": {
                "track": "2",
                "arr": "1128",
                "dep": "1128"
            },
            "st24": {
                "track": "2",
                "arr": "1132"
            }
        }
    },
    {
        "id": "t77",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "1150"
            },
            "st25": {
                "track": "2",
                "arr": "1155",
                "dep": "1155"
            },
            "st26": {
                "track": "2",
                "arr": "1200",
                "dep": "1200"
            },
            "st27": {
                "track": "2",
                "arr": "1207",
                "dep": "1207"
            },
            "st28": {
                "track": "2",
                "arr": "1212",
                "dep": "1212"
            },
            "st29": {
                "track": "2",
                "arr": "1218",
                "dep": "1218"
            },
            "st30": {
                "track": "2",
                "arr": "1221",
                "dep": "1222"
            },
            "st31": {
                "track": "2",
                "arr": "1226",
                "dep": "1226"
            },
            "st32": {
                "track": "2",
                "arr": "1229",
                "dep": "1229"
            },
            "st33": {
                "track": "2",
                "arr": "1232"
            }
        }
    },
    {
        "id": "t78",
        "trainNo": "3505N",
        "duty": "",
        "type": "快速",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1237"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "1246",
                "dep": "1246"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "1301",
                "dep": "1301"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "1308",
                "dep": "1310"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1316",
                "dep": "1316"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1323",
                "dep": "1323"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1338",
                "dep": "1338"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1349",
                "dep": "1350"
            },
            "st54": {
                "track": "2",
                "arr": "1355"
            }
        }
    },
    {
        "id": "t79",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "1051"
            },
            "st15": {
                "track": "2",
                "arr": "1056",
                "dep": "1056"
            },
            "st16": {
                "track": "2",
                "arr": "1101",
                "dep": "1101"
            },
            "st17": {
                "track": "2",
                "arr": "1104"
            }
        }
    },
    {
        "id": "t80",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "淡海一宮",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1110"
            },
            "st18": {
                "track": "2",
                "arr": "1114",
                "dep": "1115"
            },
            "st19": {
                "track": "12通",
                "arr": "1120",
                "dep": "1121"
            },
            "st20": {
                "track": "2",
                "arr": "1126",
                "dep": "1127"
            },
            "st21": {
                "track": "1",
                "arr": "1131"
            }
        }
    },
    {
        "id": "t81",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1122"
            },
            "st18": {
                "track": "2",
                "arr": "1126",
                "dep": "1126"
            },
            "st19": {
                "track": "12通",
                "arr": "1132",
                "dep": "1132"
            },
            "st20": {
                "track": "2",
                "arr": "1138",
                "dep": "1138"
            },
            "st21": {
                "track": "1",
                "arr": "1143",
                "dep": "1144"
            },
            "st22": {
                "track": "2",
                "arr": "1150",
                "dep": "1150"
            },
            "st23": {
                "track": "2",
                "arr": "1158",
                "dep": "1158"
            },
            "st24": {
                "track": "2",
                "arr": "1202"
            }
        }
    },
    {
        "id": "t82",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "1244"
            },
            "st31": {
                "track": "2",
                "arr": "1248",
                "dep": "1248"
            },
            "st32": {
                "track": "2",
                "arr": "1251",
                "dep": "1251"
            },
            "st33": {
                "track": "2",
                "arr": "1254"
            }
        }
    },
    {
        "id": "t83",
        "trainNo": "3503N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1300"
            },
            "st34": {
                "track": "2",
                "arr": "1303",
                "dep": "1303"
            },
            "st35": {
                "track": "2",
                "arr": "1306",
                "dep": "1306"
            },
            "st36": {
                "track": "2",
                "arr": "1311",
                "dep": "1311"
            },
            "st37": {
                "track": "2",
                "arr": "1317",
                "dep": "1317"
            },
            "st38": {
                "track": "2",
                "arr": "1323",
                "dep": "1323"
            },
            "st39": {
                "track": "2",
                "arr": "1329",
                "dep": "1329"
            },
            "st40": {
                "track": "2",
                "arr": "1334",
                "dep": "1334"
            },
            "st41": {
                "track": "2",
                "arr": "1338",
                "dep": "1340"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1346",
                "dep": "1346"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1353",
                "dep": "1353"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1408",
                "dep": "1408"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1419",
                "dep": "1420"
            },
            "st54": {
                "track": "2",
                "arr": "1425"
            }
        }
    },
    {
        "id": "t84",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1000"
            },
            "st1": {
                "track": "2",
                "arr": "1004",
                "dep": "1004"
            },
            "st2": {
                "track": "12通",
                "arr": "1009",
                "dep": "1009"
            },
            "st3": {
                "track": "2",
                "arr": "1015",
                "dep": "1015"
            },
            "st4": {
                "track": "2",
                "arr": "1020",
                "dep": "1020"
            },
            "st5": {
                "track": "2",
                "arr": "1023",
                "dep": "1023"
            },
            "st6": {
                "track": "2",
                "arr": "1029",
                "dep": "1029"
            },
            "st7": {
                "track": "2",
                "arr": "1034",
                "dep": "1034"
            },
            "st8": {
                "track": "2",
                "arr": "1041",
                "dep": "1041"
            },
            "st9": {
                "track": "2",
                "arr": "1047",
                "dep": "1047"
            },
            "st10": {
                "track": "2",
                "arr": "1058",
                "dep": "1058"
            },
            "st11": {
                "track": "2通",
                "arr": "1110",
                "dep": "1110"
            },
            "st12": {
                "track": "2",
                "arr": "1119",
                "dep": "1119"
            },
            "st13": {
                "track": "2",
                "arr": "1126",
                "dep": "1126"
            },
            "st14": {
                "track": "2",
                "arr": "1132",
                "dep": "1132"
            },
            "st15": {
                "track": "2",
                "arr": "1137",
                "dep": "1137"
            },
            "st16": {
                "track": "2",
                "arr": "1142",
                "dep": "1142"
            },
            "st17": {
                "track": "2",
                "arr": "1145"
            }
        }
    },
    {
        "id": "t85",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1152"
            },
            "st18": {
                "track": "2",
                "arr": "1156",
                "dep": "1156"
            },
            "st19": {
                "track": "12通",
                "arr": "1202",
                "dep": "1202"
            },
            "st20": {
                "track": "2",
                "arr": "1208",
                "dep": "1208"
            },
            "st21": {
                "track": "1",
                "arr": "1213",
                "dep": "1214"
            },
            "st22": {
                "track": "2",
                "arr": "1220",
                "dep": "1220"
            },
            "st23": {
                "track": "2",
                "arr": "1228",
                "dep": "1228"
            },
            "st24": {
                "track": "2",
                "arr": "1232"
            }
        }
    },
    {
        "id": "t86",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "1235"
            },
            "st25": {
                "track": "2",
                "arr": "1240",
                "dep": "1240"
            },
            "st26": {
                "track": "2",
                "arr": "1245",
                "dep": "1245"
            },
            "st27": {
                "track": "2",
                "arr": "1252",
                "dep": "1252"
            },
            "st28": {
                "track": "2",
                "arr": "1257",
                "dep": "1257"
            },
            "st29": {
                "track": "2",
                "arr": "1303",
                "dep": "1303"
            },
            "st30": {
                "track": "2",
                "arr": "1306",
                "dep": "1307"
            },
            "st31": {
                "track": "2",
                "arr": "1311",
                "dep": "1311"
            },
            "st32": {
                "track": "2",
                "arr": "1314",
                "dep": "1314"
            },
            "st33": {
                "track": "2",
                "arr": "1317"
            }
        }
    },
    {
        "id": "t87",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1030"
            },
            "st1": {
                "track": "2",
                "arr": "1034",
                "dep": "1034"
            },
            "st2": {
                "track": "12通",
                "arr": "1039",
                "dep": "1039"
            },
            "st3": {
                "track": "2",
                "arr": "1045",
                "dep": "1045"
            },
            "st4": {
                "track": "2",
                "arr": "1050"
            }
        }
    },
    {
        "id": "t88",
        "trainNo": "3503N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1330"
            },
            "st34": {
                "track": "2",
                "arr": "1333",
                "dep": "1333"
            },
            "st35": {
                "track": "2",
                "arr": "1336",
                "dep": "1336"
            },
            "st36": {
                "track": "2",
                "arr": "1341",
                "dep": "1341"
            },
            "st37": {
                "track": "2",
                "arr": "1347",
                "dep": "1347"
            },
            "st38": {
                "track": "2",
                "arr": "1353",
                "dep": "1353"
            },
            "st39": {
                "track": "2",
                "arr": "1359",
                "dep": "1359"
            },
            "st40": {
                "track": "2",
                "arr": "1404",
                "dep": "1404"
            },
            "st41": {
                "track": "2",
                "arr": "1408",
                "dep": "1410"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1416",
                "dep": "1416"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1423",
                "dep": "1423"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1438",
                "dep": "1438"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1449",
                "dep": "1450"
            },
            "st54": {
                "track": "2",
                "arr": "1455"
            }
        }
    },
    {
        "id": "t89",
        "trainNo": "3M",
        "duty": "",
        "type": "特急",
        "name": "ひるかわ",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1050"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "1103",
                "dep": "1103"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "1113",
                "dep": "1113"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "1123"
            }
        }
    },
    {
        "id": "t90",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1218"
            },
            "st18": {
                "track": "2",
                "arr": "1222",
                "dep": "1222"
            },
            "st19": {
                "track": "12通",
                "arr": "1228",
                "dep": "1228"
            },
            "st20": {
                "track": "2",
                "arr": "1234",
                "dep": "1234"
            },
            "st21": {
                "track": "1",
                "arr": "1239",
                "dep": "1244"
            },
            "st22": {
                "track": "2",
                "arr": "1250",
                "dep": "1250"
            },
            "st23": {
                "track": "2",
                "arr": "1258",
                "dep": "1258"
            },
            "st24": {
                "track": "2",
                "arr": "1302"
            }
        }
    },
    {
        "id": "t91",
        "trainNo": "3601",
        "duty": "",
        "type": "快速",
        "name": "八剣",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1224"
            },
            "st18": {
                "pass": true
            },
            "st19": {
                "track": "12通",
                "arr": "1232",
                "dep": "1232"
            },
            "st20": {
                "pass": true
            },
            "st21": {
                "track": "1",
                "arr": "1241",
                "dep": "1242"
            },
            "st22": {
                "pass": true
            },
            "st23": {
                "pass": true
            },
            "st24": {
                "track": "2",
                "arr": "1256"
            }
        }
    },
    {
        "id": "t92",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1100"
            },
            "st1": {
                "track": "2",
                "arr": "1104",
                "dep": "1104"
            },
            "st2": {
                "track": "12通",
                "arr": "1109",
                "dep": "1109"
            },
            "st3": {
                "track": "2",
                "arr": "1115",
                "dep": "1115"
            },
            "st4": {
                "track": "2",
                "arr": "1120",
                "dep": "1120"
            },
            "st5": {
                "track": "2",
                "arr": "1123",
                "dep": "1123"
            },
            "st6": {
                "track": "2",
                "arr": "1129",
                "dep": "1129"
            },
            "st7": {
                "track": "2",
                "arr": "1134",
                "dep": "1134"
            },
            "st8": {
                "track": "2",
                "arr": "1141",
                "dep": "1141"
            },
            "st9": {
                "track": "2",
                "arr": "1147"
            }
        }
    },
    {
        "id": "t93",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "1220"
            },
            "st13": {
                "track": "2",
                "arr": "1227",
                "dep": "1227"
            },
            "st14": {
                "track": "2",
                "arr": "1233",
                "dep": "1233"
            },
            "st15": {
                "track": "2",
                "arr": "1238",
                "dep": "1238"
            },
            "st16": {
                "track": "2",
                "arr": "1243",
                "dep": "1243"
            },
            "st17": {
                "track": "2",
                "arr": "1246"
            }
        }
    },
    {
        "id": "t94",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1252"
            },
            "st18": {
                "track": "2",
                "arr": "1256",
                "dep": "1256"
            },
            "st19": {
                "track": "12通",
                "arr": "1302",
                "dep": "1302"
            },
            "st20": {
                "track": "2",
                "arr": "1308",
                "dep": "1308"
            },
            "st21": {
                "track": "1",
                "arr": "1313",
                "dep": "1314"
            },
            "st22": {
                "track": "2",
                "arr": "1320",
                "dep": "1320"
            },
            "st23": {
                "track": "2",
                "arr": "1328",
                "dep": "1328"
            },
            "st24": {
                "track": "2",
                "arr": "1332"
            }
        }
    },
    {
        "id": "t95",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "1320"
            },
            "st25": {
                "track": "2",
                "arr": "1325",
                "dep": "1325"
            },
            "st26": {
                "track": "2",
                "arr": "1330",
                "dep": "1330"
            },
            "st27": {
                "track": "2",
                "arr": "1337",
                "dep": "1337"
            },
            "st28": {
                "track": "2",
                "arr": "1342",
                "dep": "1342"
            },
            "st29": {
                "track": "2",
                "arr": "1348",
                "dep": "1348"
            },
            "st30": {
                "track": "2",
                "arr": "1351",
                "dep": "1352"
            },
            "st31": {
                "track": "2",
                "arr": "1356",
                "dep": "1356"
            },
            "st32": {
                "track": "2",
                "arr": "1359",
                "dep": "1359"
            },
            "st33": {
                "track": "2",
                "arr": "1402"
            }
        }
    },
    {
        "id": "t96",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1130"
            },
            "st1": {
                "track": "2",
                "arr": "1134",
                "dep": "1134"
            },
            "st2": {
                "track": "12通",
                "arr": "1139",
                "dep": "1139"
            },
            "st3": {
                "track": "2",
                "arr": "1145",
                "dep": "1145"
            },
            "st4": {
                "track": "2",
                "arr": "1150"
            }
        }
    },
    {
        "id": "t97",
        "trainNo": "3505N",
        "duty": "",
        "type": "快速",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1407"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "1416",
                "dep": "1416"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "1431",
                "dep": "1431"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "1438",
                "dep": "1440"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1446",
                "dep": "1446"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1453",
                "dep": "1453"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1508",
                "dep": "1508"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1519",
                "dep": "1520"
            },
            "st54": {
                "track": "2",
                "arr": "1525"
            }
        }
    },
    {
        "id": "t98",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海崎",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st26": {
                "track": "2",
                "dep": "1353"
            },
            "st27": {
                "track": "2",
                "arr": "1400",
                "dep": "1400"
            },
            "st28": {
                "track": "2",
                "arr": "1405",
                "dep": "1405"
            },
            "st29": {
                "track": "2",
                "arr": "1411",
                "dep": "1411"
            },
            "st30": {
                "track": "2",
                "arr": "1414",
                "dep": "1415"
            },
            "st31": {
                "track": "2",
                "arr": "1419",
                "dep": "1419"
            },
            "st32": {
                "track": "2",
                "arr": "1422",
                "dep": "1422"
            },
            "st33": {
                "track": "2",
                "arr": "1425"
            }
        }
    },
    {
        "id": "t99",
        "trainNo": "3505N",
        "duty": "",
        "type": "快速",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1437"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "1446",
                "dep": "1446"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "1501",
                "dep": "1501"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "1508",
                "dep": "1510"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1516",
                "dep": "1516"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1523",
                "dep": "1523"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1538",
                "dep": "1538"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1549",
                "dep": "1550"
            },
            "st54": {
                "track": "2",
                "arr": "1555"
            }
        }
    },
    {
        "id": "t100",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "1306"
            },
            "st15": {
                "track": "2",
                "arr": "1311",
                "dep": "1311"
            },
            "st16": {
                "track": "2",
                "arr": "1316",
                "dep": "1316"
            },
            "st17": {
                "track": "2",
                "arr": "1319"
            }
        }
    },
    {
        "id": "t101",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1322"
            },
            "st18": {
                "track": "2",
                "arr": "1326",
                "dep": "1326"
            },
            "st19": {
                "track": "12通",
                "arr": "1332",
                "dep": "1332"
            },
            "st20": {
                "track": "2",
                "arr": "1338",
                "dep": "1338"
            },
            "st21": {
                "track": "1",
                "arr": "1343",
                "dep": "1344"
            },
            "st22": {
                "track": "2",
                "arr": "1350",
                "dep": "1350"
            },
            "st23": {
                "track": "2",
                "arr": "1358",
                "dep": "1358"
            },
            "st24": {
                "track": "2",
                "arr": "1402"
            }
        }
    },
    {
        "id": "t102",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "1406"
            },
            "st25": {
                "track": "2",
                "arr": "1411",
                "dep": "1411"
            },
            "st26": {
                "track": "2",
                "arr": "1416",
                "dep": "1416"
            },
            "st27": {
                "track": "2",
                "arr": "1423",
                "dep": "1423"
            },
            "st28": {
                "track": "2",
                "arr": "1428",
                "dep": "1428"
            },
            "st29": {
                "track": "2",
                "arr": "1434",
                "dep": "1434"
            },
            "st30": {
                "track": "2",
                "arr": "1437",
                "dep": "1438"
            },
            "st31": {
                "track": "2",
                "arr": "1442",
                "dep": "1442"
            },
            "st32": {
                "track": "2",
                "arr": "1445",
                "dep": "1445"
            },
            "st33": {
                "track": "2",
                "arr": "1448"
            }
        }
    },
    {
        "id": "t103",
        "trainNo": "5M",
        "duty": "",
        "type": "特急",
        "name": "ひるかわ",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1150"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "1203",
                "dep": "1203"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "1213",
                "dep": "1213"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "1223"
            }
        }
    },
    {
        "id": "t104",
        "trainNo": "3503N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1500"
            },
            "st34": {
                "track": "2",
                "arr": "1503",
                "dep": "1503"
            },
            "st35": {
                "track": "2",
                "arr": "1506",
                "dep": "1506"
            },
            "st36": {
                "track": "2",
                "arr": "1511",
                "dep": "1511"
            },
            "st37": {
                "track": "2",
                "arr": "1517",
                "dep": "1517"
            },
            "st38": {
                "track": "2",
                "arr": "1523",
                "dep": "1523"
            },
            "st39": {
                "track": "2",
                "arr": "1529",
                "dep": "1529"
            },
            "st40": {
                "track": "2",
                "arr": "1534",
                "dep": "1534"
            },
            "st41": {
                "track": "2",
                "arr": "1538",
                "dep": "1540"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1546",
                "dep": "1546"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1553",
                "dep": "1553"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1608",
                "dep": "1608"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1619"
            }
        }
    },
    {
        "id": "t105",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "1500"
            },
            "st31": {
                "track": "2",
                "arr": "1504",
                "dep": "1504"
            },
            "st32": {
                "track": "2",
                "arr": "1507",
                "dep": "1507"
            },
            "st33": {
                "track": "2",
                "arr": "1510"
            }
        }
    },
    {
        "id": "t106",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1200"
            },
            "st1": {
                "track": "2",
                "arr": "1204",
                "dep": "1204"
            },
            "st2": {
                "track": "12通",
                "arr": "1209",
                "dep": "1209"
            },
            "st3": {
                "track": "2",
                "arr": "1215",
                "dep": "1215"
            },
            "st4": {
                "track": "2",
                "arr": "1220",
                "dep": "1220"
            },
            "st5": {
                "track": "2",
                "arr": "1223",
                "dep": "1223"
            },
            "st6": {
                "track": "2",
                "arr": "1229",
                "dep": "1229"
            },
            "st7": {
                "track": "2",
                "arr": "1234",
                "dep": "1234"
            },
            "st8": {
                "track": "2",
                "arr": "1241",
                "dep": "1241"
            },
            "st9": {
                "track": "2",
                "arr": "1247",
                "dep": "1247"
            },
            "st10": {
                "track": "2",
                "arr": "1258",
                "dep": "1258"
            },
            "st11": {
                "track": "2通",
                "arr": "1310",
                "dep": "1310"
            },
            "st12": {
                "track": "2",
                "arr": "1319",
                "dep": "1319"
            },
            "st13": {
                "track": "2",
                "arr": "1326",
                "dep": "1326"
            },
            "st14": {
                "track": "2",
                "arr": "1332",
                "dep": "1332"
            },
            "st15": {
                "track": "2",
                "arr": "1337",
                "dep": "1337"
            },
            "st16": {
                "track": "2",
                "arr": "1342",
                "dep": "1342"
            },
            "st17": {
                "track": "2",
                "arr": "1345"
            }
        }
    },
    {
        "id": "t107",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1352"
            },
            "st18": {
                "track": "2",
                "arr": "1356",
                "dep": "1356"
            },
            "st19": {
                "track": "12通",
                "arr": "1402",
                "dep": "1402"
            },
            "st20": {
                "track": "2",
                "arr": "1408",
                "dep": "1408"
            },
            "st21": {
                "track": "1",
                "arr": "1413",
                "dep": "1414"
            },
            "st22": {
                "track": "2",
                "arr": "1420",
                "dep": "1420"
            },
            "st23": {
                "track": "2",
                "arr": "1428",
                "dep": "1428"
            },
            "st24": {
                "track": "2",
                "arr": "1432"
            }
        }
    },
    {
        "id": "t108",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1230"
            },
            "st1": {
                "track": "2",
                "arr": "1234",
                "dep": "1234"
            },
            "st2": {
                "track": "12通",
                "arr": "1239",
                "dep": "1239"
            },
            "st3": {
                "track": "2",
                "arr": "1245",
                "dep": "1245"
            },
            "st4": {
                "track": "2",
                "arr": "1250"
            }
        }
    },
    {
        "id": "t109",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "1450"
            },
            "st25": {
                "track": "2",
                "arr": "1455",
                "dep": "1455"
            },
            "st26": {
                "track": "2",
                "arr": "1500",
                "dep": "1500"
            },
            "st27": {
                "track": "2",
                "arr": "1507",
                "dep": "1507"
            },
            "st28": {
                "track": "2",
                "arr": "1512",
                "dep": "1512"
            },
            "st29": {
                "track": "2",
                "arr": "1518",
                "dep": "1518"
            },
            "st30": {
                "track": "2",
                "arr": "1521",
                "dep": "1522"
            },
            "st31": {
                "track": "2",
                "arr": "1526",
                "dep": "1526"
            },
            "st32": {
                "track": "2",
                "arr": "1529",
                "dep": "1529"
            },
            "st33": {
                "track": "2",
                "arr": "1532"
            }
        }
    },
    {
        "id": "t110",
        "trainNo": "3505N",
        "duty": "",
        "type": "快速",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1537"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "1546",
                "dep": "1546"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "1601",
                "dep": "1601"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "1608",
                "dep": "1610"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1616",
                "dep": "1616"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1623",
                "dep": "1623"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1638",
                "dep": "1638"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1649",
                "dep": "1650"
            },
            "st54": {
                "track": "2",
                "arr": "1655"
            }
        }
    },
    {
        "id": "t111",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "1352"
            },
            "st13": {
                "track": "2",
                "arr": "1359",
                "dep": "1359"
            },
            "st14": {
                "track": "2",
                "arr": "1405",
                "dep": "1405"
            },
            "st15": {
                "track": "2",
                "arr": "1410",
                "dep": "1410"
            },
            "st16": {
                "track": "2",
                "arr": "1415",
                "dep": "1415"
            },
            "st17": {
                "track": "2",
                "arr": "1418"
            }
        }
    },
    {
        "id": "t112",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1422"
            },
            "st18": {
                "track": "2",
                "arr": "1426",
                "dep": "1426"
            },
            "st19": {
                "track": "12通",
                "arr": "1432",
                "dep": "1432"
            },
            "st20": {
                "track": "2",
                "arr": "1438",
                "dep": "1438"
            },
            "st21": {
                "track": "1",
                "arr": "1443",
                "dep": "1444"
            },
            "st22": {
                "track": "2",
                "arr": "1450",
                "dep": "1450"
            },
            "st23": {
                "track": "2",
                "arr": "1458",
                "dep": "1458"
            },
            "st24": {
                "track": "2",
                "arr": "1502"
            }
        }
    },
    {
        "id": "t113",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "1547"
            },
            "st31": {
                "track": "2",
                "arr": "1551",
                "dep": "1551"
            },
            "st32": {
                "track": "2",
                "arr": "1554",
                "dep": "1554"
            },
            "st33": {
                "track": "2",
                "arr": "1557"
            }
        }
    },
    {
        "id": "t114",
        "trainNo": "9051M",
        "duty": "",
        "type": "特急",
        "name": "ひるかわ",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1250"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "1303",
                "dep": "1303"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "1313",
                "dep": "1313"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "1323"
            }
        }
    },
    {
        "id": "t115",
        "trainNo": "3503N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1600"
            },
            "st34": {
                "track": "2",
                "arr": "1603",
                "dep": "1603"
            },
            "st35": {
                "track": "2",
                "arr": "1606",
                "dep": "1606"
            },
            "st36": {
                "track": "2",
                "arr": "1611",
                "dep": "1611"
            },
            "st37": {
                "track": "2",
                "arr": "1617",
                "dep": "1617"
            },
            "st38": {
                "track": "2",
                "arr": "1623",
                "dep": "1623"
            },
            "st39": {
                "track": "2",
                "arr": "1629",
                "dep": "1629"
            },
            "st40": {
                "track": "2",
                "arr": "1634",
                "dep": "1634"
            },
            "st41": {
                "track": "2",
                "arr": "1638",
                "dep": "1640"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1646",
                "dep": "1646"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1653",
                "dep": "1653"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1708",
                "dep": "1708"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1719",
                "dep": "1720"
            },
            "st54": {
                "track": "2",
                "arr": "1725"
            }
        }
    },
    {
        "id": "t116",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1300"
            },
            "st1": {
                "track": "2",
                "arr": "1304",
                "dep": "1304"
            },
            "st2": {
                "track": "12通",
                "arr": "1309",
                "dep": "1309"
            },
            "st3": {
                "track": "2",
                "arr": "1315",
                "dep": "1315"
            },
            "st4": {
                "track": "2",
                "arr": "1320",
                "dep": "1320"
            },
            "st5": {
                "track": "2",
                "arr": "1323",
                "dep": "1323"
            },
            "st6": {
                "track": "2",
                "arr": "1329",
                "dep": "1329"
            },
            "st7": {
                "track": "2",
                "arr": "1334",
                "dep": "1334"
            },
            "st8": {
                "track": "2",
                "arr": "1341",
                "dep": "1341"
            },
            "st9": {
                "track": "2",
                "arr": "1347"
            }
        }
    },
    {
        "id": "t117",
        "trainNo": "935D",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "横賀",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st7": {
                "track": "2",
                "dep": "1337"
            },
            "st8": {
                "track": "2",
                "arr": "1344",
                "dep": "1344"
            },
            "st9": {
                "track": "2",
                "arr": "1350",
                "dep": "1350"
            },
            "st10": {
                "track": "2",
                "arr": "1401",
                "dep": "1401"
            },
            "st11": {
                "track": "2通",
                "arr": "1413",
                "dep": "1413"
            },
            "st12": {
                "track": "2",
                "arr": "1422",
                "dep": "1422"
            },
            "st13": {
                "track": "2",
                "arr": "1429",
                "dep": "1429"
            },
            "st14": {
                "track": "2",
                "arr": "1435",
                "dep": "1435"
            },
            "st15": {
                "track": "2",
                "arr": "1440",
                "dep": "1440"
            },
            "st16": {
                "track": "2",
                "arr": "1445",
                "dep": "1445"
            },
            "st17": {
                "track": "2",
                "arr": "1448"
            }
        }
    },
    {
        "id": "t118",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "淡海一宮",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1452"
            },
            "st18": {
                "track": "2",
                "arr": "1456",
                "dep": "1456"
            },
            "st19": {
                "track": "12通",
                "arr": "1502",
                "dep": "1502"
            },
            "st20": {
                "track": "2",
                "arr": "1508",
                "dep": "1508"
            },
            "st21": {
                "track": "1",
                "arr": "1513"
            }
        }
    },
    {
        "id": "t119",
        "trainNo": "931D",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海一宮",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st21": {
                "track": "1",
                "dep": "1515"
            },
            "st22": {
                "track": "2",
                "arr": "1521",
                "dep": "1521"
            },
            "st23": {
                "track": "2",
                "arr": "1529",
                "dep": "1529"
            },
            "st24": {
                "track": "2",
                "arr": "1533"
            }
        }
    },
    {
        "id": "t120",
        "trainNo": "933D",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "1537"
            },
            "st25": {
                "track": "2",
                "arr": "1542",
                "dep": "1542"
            },
            "st26": {
                "track": "2",
                "arr": "1547",
                "dep": "1547"
            },
            "st27": {
                "track": "2",
                "arr": "1554",
                "dep": "1554"
            },
            "st28": {
                "track": "2",
                "arr": "1559",
                "dep": "1559"
            },
            "st29": {
                "track": "2",
                "arr": "1605",
                "dep": "1605"
            },
            "st30": {
                "track": "2",
                "arr": "1608",
                "dep": "1609"
            },
            "st31": {
                "track": "2",
                "arr": "1613",
                "dep": "1614"
            },
            "st32": {
                "track": "2",
                "arr": "1617",
                "dep": "1617"
            },
            "st33": {
                "track": "2",
                "arr": "1621"
            }
        }
    },
    {
        "id": "t121",
        "trainNo": "3505N",
        "duty": "",
        "type": "快速",
        "name": "サハラeライナー",
        "startStation": "桐屋",
        "startWork": "",
        "endStation": "南砂原",
        "endWork": "",
        "times": {
            "st33": {
                "track": "2",
                "dep": "1637"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "1646",
                "dep": "1646"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "1701",
                "dep": "1701"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "1708",
                "dep": "1710"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1716",
                "dep": "1716"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1723",
                "dep": "1723"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1738",
                "dep": "1738"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1749",
                "dep": "1750"
            },
            "st54": {
                "track": "2",
                "arr": "1755"
            }
        }
    },
    {
        "id": "t122",
        "trainNo": "931D",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1519"
            },
            "st18": {
                "track": "2",
                "arr": "1523",
                "dep": "1524"
            },
            "st19": {
                "track": "12通",
                "arr": "1529",
                "dep": "1530"
            },
            "st20": {
                "track": "2",
                "arr": "1535",
                "dep": "1536"
            },
            "st21": {
                "track": "1",
                "arr": "1540",
                "dep": "1541"
            },
            "st22": {
                "track": "2",
                "arr": "1547",
                "dep": "1547"
            },
            "st23": {
                "track": "2",
                "arr": "1555",
                "dep": "1555"
            },
            "st24": {
                "track": "2",
                "arr": "1559"
            }
        }
    },
    {
        "id": "t123",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1330"
            },
            "st1": {
                "track": "2",
                "arr": "1334",
                "dep": "1334"
            },
            "st2": {
                "track": "12通",
                "arr": "1339",
                "dep": "1339"
            },
            "st3": {
                "track": "2",
                "arr": "1345",
                "dep": "1345"
            },
            "st4": {
                "track": "2",
                "arr": "1350"
            }
        }
    },
    {
        "id": "t124",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "1506"
            },
            "st15": {
                "track": "2",
                "arr": "1511",
                "dep": "1511"
            },
            "st16": {
                "track": "2",
                "arr": "1516",
                "dep": "1516"
            },
            "st17": {
                "track": "2",
                "arr": "1519"
            }
        }
    },
    {
        "id": "t125",
        "trainNo": "",
        "duty": "",
        "type": "快速",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1538"
            },
            "st18": {
                "pass": true
            },
            "st19": {
                "track": "12通",
                "arr": "1546",
                "dep": "1546"
            },
            "st20": {
                "pass": true
            },
            "st21": {
                "track": "1",
                "arr": "1555",
                "dep": "1556"
            },
            "st22": {
                "pass": true
            },
            "st23": {
                "pass": true
            },
            "st24": {
                "track": "2",
                "arr": "1608"
            }
        }
    },
    {
        "id": "t126",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋本町",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "1610"
            },
            "st25": {
                "track": "2",
                "arr": "1615",
                "dep": "1615"
            },
            "st26": {
                "track": "2",
                "arr": "1620",
                "dep": "1620"
            },
            "st27": {
                "track": "2",
                "arr": "1627",
                "dep": "1627"
            },
            "st28": {
                "track": "2",
                "arr": "1632",
                "dep": "1632"
            },
            "st29": {
                "track": "2",
                "arr": "1638",
                "dep": "1638"
            },
            "st30": {
                "track": "2",
                "arr": "1641"
            }
        }
    },
    {
        "id": "t127",
        "trainNo": "933D",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "1645"
            },
            "st31": {
                "track": "2",
                "arr": "1649",
                "dep": "1649"
            },
            "st32": {
                "track": "2",
                "arr": "1652",
                "dep": "1653"
            },
            "st33": {
                "track": "2",
                "arr": "1656"
            }
        }
    },
    {
        "id": "t128",
        "trainNo": "935D",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1400"
            },
            "st1": {
                "track": "2",
                "arr": "1404",
                "dep": "1404"
            },
            "st2": {
                "track": "12通",
                "arr": "1409",
                "dep": "1409"
            },
            "st3": {
                "track": "2",
                "arr": "1415",
                "dep": "1415"
            },
            "st4": {
                "track": "2",
                "arr": "1420",
                "dep": "1420"
            },
            "st5": {
                "track": "2",
                "arr": "1423",
                "dep": "1423"
            },
            "st6": {
                "track": "2",
                "arr": "1429",
                "dep": "1429"
            },
            "st7": {
                "track": "2",
                "arr": "1434",
                "dep": "1434"
            },
            "st8": {
                "track": "2",
                "arr": "1441",
                "dep": "1441"
            },
            "st9": {
                "track": "2",
                "arr": "1447",
                "dep": "1447"
            },
            "st10": {
                "track": "2",
                "arr": "1458",
                "dep": "1458"
            },
            "st11": {
                "track": "2通",
                "arr": "1510",
                "dep": "1510"
            },
            "st12": {
                "track": "2",
                "arr": "1519",
                "dep": "1519"
            },
            "st13": {
                "track": "2",
                "arr": "1526",
                "dep": "1526"
            },
            "st14": {
                "track": "2",
                "arr": "1532",
                "dep": "1532"
            },
            "st15": {
                "track": "2",
                "arr": "1537",
                "dep": "1537"
            },
            "st16": {
                "track": "2",
                "arr": "1542",
                "dep": "1542"
            },
            "st17": {
                "track": "2",
                "arr": "1545"
            }
        }
    },
    {
        "id": "t129",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋本町",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1549"
            },
            "st18": {
                "track": "2",
                "arr": "1553",
                "dep": "1553"
            },
            "st19": {
                "track": "12通",
                "arr": "1559",
                "dep": "1559"
            },
            "st20": {
                "track": "2",
                "arr": "1605",
                "dep": "1605"
            },
            "st21": {
                "track": "1",
                "arr": "1610",
                "dep": "1611"
            },
            "st22": {
                "track": "2",
                "arr": "1617",
                "dep": "1617"
            },
            "st23": {
                "track": "2",
                "arr": "1625",
                "dep": "1625"
            },
            "st24": {
                "track": "2",
                "arr": "1629",
                "dep": "1637"
            },
            "st25": {
                "track": "2",
                "arr": "1642",
                "dep": "1642"
            },
            "st26": {
                "track": "2",
                "arr": "1647",
                "dep": "1647"
            },
            "st27": {
                "track": "2",
                "arr": "1654",
                "dep": "1654"
            },
            "st28": {
                "track": "2",
                "arr": "1659",
                "dep": "1659"
            },
            "st29": {
                "track": "2",
                "arr": "1705",
                "dep": "1705"
            },
            "st30": {
                "track": "2",
                "arr": "1708"
            }
        }
    },
    {
        "id": "t130",
        "trainNo": "3505N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "1713"
            },
            "st31": {
                "track": "2",
                "arr": "1717",
                "dep": "1717"
            },
            "st32": {
                "track": "2",
                "arr": "1720",
                "dep": "1720"
            },
            "st33": {
                "track": "2",
                "arr": "1723",
                "dep": "1724"
            },
            "st34": {
                "track": "2",
                "arr": "1727",
                "dep": "1727"
            },
            "st35": {
                "track": "2",
                "arr": "1730",
                "dep": "1730"
            },
            "st36": {
                "track": "2",
                "arr": "1735",
                "dep": "1735"
            },
            "st37": {
                "track": "2",
                "arr": "1741",
                "dep": "1741"
            },
            "st38": {
                "track": "2",
                "arr": "1747",
                "dep": "1747"
            },
            "st39": {
                "track": "2",
                "arr": "1753",
                "dep": "1753"
            },
            "st40": {
                "track": "2",
                "arr": "1758",
                "dep": "1758"
            },
            "st41": {
                "track": "2",
                "arr": "1802",
                "dep": "1804"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1810",
                "dep": "1810"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1817",
                "dep": "1817"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1832",
                "dep": "1832"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1843"
            }
        }
    },
    {
        "id": "t131",
        "trainNo": "",
        "duty": "",
        "type": "快速",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "1544"
            },
            "st13": {
                "pass": true
            },
            "st14": {
                "track": "2",
                "arr": "1554",
                "dep": "1555"
            },
            "st15": {
                "pass": true
            },
            "st16": {
                "pass": true
            },
            "st17": {
                "track": "2",
                "arr": "1604"
            }
        }
    },
    {
        "id": "t132",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1605"
            },
            "st18": {
                "track": "2",
                "arr": "1609",
                "dep": "1609"
            },
            "st19": {
                "track": "12通",
                "arr": "1615",
                "dep": "1615"
            },
            "st20": {
                "track": "2",
                "arr": "1621",
                "dep": "1621"
            },
            "st21": {
                "track": "1",
                "arr": "1626",
                "dep": "1627"
            },
            "st22": {
                "track": "2",
                "arr": "1633",
                "dep": "1633"
            },
            "st23": {
                "track": "2",
                "arr": "1641",
                "dep": "1641"
            },
            "st24": {
                "track": "2",
                "arr": "1645",
                "dep": "1657"
            },
            "st25": {
                "track": "2",
                "arr": "1702",
                "dep": "1702"
            },
            "st26": {
                "track": "2",
                "arr": "1707",
                "dep": "1707"
            },
            "st27": {
                "track": "2",
                "arr": "1714",
                "dep": "1714"
            },
            "st28": {
                "track": "2",
                "arr": "1719",
                "dep": "1719"
            },
            "st29": {
                "track": "2",
                "arr": "1725",
                "dep": "1725"
            },
            "st30": {
                "track": "2",
                "arr": "1728",
                "dep": "1729"
            },
            "st31": {
                "track": "2",
                "arr": "1733",
                "dep": "1733"
            },
            "st32": {
                "track": "2",
                "arr": "1736",
                "dep": "1736"
            },
            "st33": {
                "track": "2",
                "arr": "1739"
            }
        }
    },
    {
        "id": "t133",
        "trainNo": "931D",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1623"
            },
            "st18": {
                "track": "2",
                "arr": "1627",
                "dep": "1628"
            },
            "st19": {
                "track": "12通",
                "arr": "1633",
                "dep": "1634"
            },
            "st20": {
                "track": "2",
                "arr": "1639",
                "dep": "1640"
            },
            "st21": {
                "track": "1",
                "arr": "1644",
                "dep": "1645"
            },
            "st22": {
                "track": "2",
                "arr": "1651",
                "dep": "1651"
            },
            "st23": {
                "track": "2",
                "arr": "1659",
                "dep": "1659"
            },
            "st24": {
                "track": "2",
                "arr": "1703"
            }
        }
    },
    {
        "id": "t134",
        "trainNo": "",
        "duty": "",
        "type": "快速",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "1707"
            },
            "st25": {
                "pass": true
            },
            "st26": {
                "track": "2",
                "arr": "1716",
                "dep": "1716"
            },
            "st27": {
                "pass": true
            },
            "st28": {
                "track": "2",
                "arr": "1726",
                "dep": "1726"
            },
            "st29": {
                "pass": true
            },
            "st30": {
                "track": "2",
                "arr": "1733",
                "dep": "1734"
            },
            "st31": {
                "pass": true
            },
            "st32": {
                "pass": true
            },
            "st33": {
                "track": "2",
                "arr": "1742"
            }
        }
    },
    {
        "id": "t135",
        "trainNo": "",
        "duty": "",
        "type": "回送",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "室川福田",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1410"
            },
            "st1": {
                "track": "2",
                "arr": "1414",
                "dep": "1414"
            }
        }
    },
    {
        "id": "t136",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1430"
            },
            "st1": {
                "track": "2",
                "arr": "1434",
                "dep": "1434"
            },
            "st2": {
                "track": "12通",
                "arr": "1439",
                "dep": "1439"
            },
            "st3": {
                "track": "2",
                "arr": "1445",
                "dep": "1445"
            },
            "st4": {
                "track": "2",
                "arr": "1450"
            }
        }
    },
    {
        "id": "t137",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "1608"
            },
            "st13": {
                "track": "2",
                "arr": "1615",
                "dep": "1615"
            },
            "st14": {
                "track": "2",
                "arr": "1621",
                "dep": "1621"
            },
            "st15": {
                "track": "2",
                "arr": "1626",
                "dep": "1626"
            },
            "st16": {
                "track": "2",
                "arr": "1631",
                "dep": "1631"
            },
            "st17": {
                "track": "2",
                "arr": "1634"
            }
        }
    },
    {
        "id": "t138",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋本町",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1645"
            },
            "st18": {
                "track": "2",
                "arr": "1649",
                "dep": "1649"
            },
            "st19": {
                "track": "12通",
                "arr": "1655",
                "dep": "1655"
            },
            "st20": {
                "track": "2",
                "arr": "1701",
                "dep": "1701"
            },
            "st21": {
                "track": "1",
                "arr": "1706",
                "dep": "1707"
            },
            "st22": {
                "track": "2",
                "arr": "1713",
                "dep": "1713"
            },
            "st23": {
                "track": "2",
                "arr": "1721",
                "dep": "1721"
            },
            "st24": {
                "track": "2",
                "arr": "1725",
                "dep": "1726"
            },
            "st25": {
                "track": "2",
                "arr": "1731",
                "dep": "1731"
            },
            "st26": {
                "track": "2",
                "arr": "1736",
                "dep": "1736"
            },
            "st27": {
                "track": "2",
                "arr": "1743",
                "dep": "1743"
            },
            "st28": {
                "track": "2",
                "arr": "1748",
                "dep": "1748"
            },
            "st29": {
                "track": "2",
                "arr": "1754",
                "dep": "1754"
            },
            "st30": {
                "track": "2",
                "arr": "1757"
            }
        }
    },
    {
        "id": "t139",
        "trainNo": "3505N",
        "duty": "",
        "type": "区快",
        "name": "サハラeライナー",
        "startStation": "桐屋本町",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st30": {
                "track": "2",
                "dep": "1800"
            },
            "st31": {
                "track": "2",
                "arr": "1804",
                "dep": "1804"
            },
            "st32": {
                "track": "2",
                "arr": "1807",
                "dep": "1807"
            },
            "st33": {
                "track": "2",
                "arr": "1810",
                "dep": "1811"
            },
            "st34": {
                "track": "2",
                "arr": "1814",
                "dep": "1814"
            },
            "st35": {
                "track": "2",
                "arr": "1817",
                "dep": "1817"
            },
            "st36": {
                "track": "2",
                "arr": "1822",
                "dep": "1822"
            },
            "st37": {
                "track": "2",
                "arr": "1828",
                "dep": "1828"
            },
            "st38": {
                "track": "2",
                "arr": "1834",
                "dep": "1834"
            },
            "st39": {
                "track": "2",
                "arr": "1840",
                "dep": "1840"
            },
            "st40": {
                "track": "2",
                "arr": "1845",
                "dep": "1845"
            },
            "st41": {
                "track": "2",
                "arr": "1849",
                "dep": "1851"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "track": "2",
                "arr": "1857",
                "dep": "1857"
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "1904",
                "dep": "1904"
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "1919",
                "dep": "1919"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "1930"
            }
        }
    },
    {
        "id": "t140",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1500"
            },
            "st1": {
                "track": "2",
                "arr": "1504",
                "dep": "1504"
            },
            "st2": {
                "track": "12通",
                "arr": "1509",
                "dep": "1509"
            },
            "st3": {
                "track": "2",
                "arr": "1515",
                "dep": "1515"
            },
            "st4": {
                "track": "2",
                "arr": "1520",
                "dep": "1520"
            },
            "st5": {
                "track": "2",
                "arr": "1523",
                "dep": "1523"
            },
            "st6": {
                "track": "2",
                "arr": "1529",
                "dep": "1529"
            },
            "st7": {
                "track": "2",
                "arr": "1534",
                "dep": "1534"
            },
            "st8": {
                "track": "2",
                "arr": "1541",
                "dep": "1541"
            },
            "st9": {
                "track": "2",
                "arr": "1547"
            }
        }
    },
    {
        "id": "t141",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1708"
            },
            "st18": {
                "track": "2",
                "arr": "1712",
                "dep": "1712"
            },
            "st19": {
                "track": "12通",
                "arr": "1718",
                "dep": "1718"
            },
            "st20": {
                "track": "2",
                "arr": "1724",
                "dep": "1724"
            },
            "st21": {
                "track": "1",
                "arr": "1729",
                "dep": "1730"
            },
            "st22": {
                "track": "2",
                "arr": "1736",
                "dep": "1736"
            },
            "st23": {
                "track": "2",
                "arr": "1744",
                "dep": "1744"
            },
            "st24": {
                "track": "2",
                "arr": "1748",
                "dep": "1749"
            },
            "st25": {
                "track": "2",
                "arr": "1754",
                "dep": "1754"
            },
            "st26": {
                "track": "2",
                "arr": "1759",
                "dep": "1759"
            },
            "st27": {
                "track": "2",
                "arr": "1806",
                "dep": "1806"
            },
            "st28": {
                "track": "2",
                "arr": "1811",
                "dep": "1811"
            },
            "st29": {
                "track": "2",
                "arr": "1817",
                "dep": "1817"
            },
            "st30": {
                "track": "2",
                "arr": "1820",
                "dep": "1821"
            },
            "st31": {
                "track": "2",
                "arr": "1825",
                "dep": "1825"
            },
            "st32": {
                "track": "2",
                "arr": "1828",
                "dep": "1828"
            },
            "st33": {
                "track": "2",
                "arr": "1831"
            }
        }
    },
    {
        "id": "t142",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1530"
            },
            "st1": {
                "track": "2",
                "arr": "1534",
                "dep": "1534"
            },
            "st2": {
                "track": "12通",
                "arr": "1539",
                "dep": "1539"
            },
            "st3": {
                "track": "2",
                "arr": "1545",
                "dep": "1545"
            },
            "st4": {
                "track": "2",
                "arr": "1550"
            }
        }
    },
    {
        "id": "t143",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "1700"
            },
            "st15": {
                "track": "2",
                "arr": "1705",
                "dep": "1705"
            },
            "st16": {
                "track": "2",
                "arr": "1710",
                "dep": "1710"
            },
            "st17": {
                "track": "2",
                "arr": "1713",
                "dep": "1725"
            },
            "st18": {
                "track": "2",
                "arr": "1729",
                "dep": "1729"
            },
            "st19": {
                "track": "12通",
                "arr": "1735",
                "dep": "1735"
            },
            "st20": {
                "track": "2",
                "arr": "1741",
                "dep": "1741"
            },
            "st21": {
                "track": "1",
                "arr": "1746",
                "dep": "1747"
            },
            "st22": {
                "track": "2",
                "arr": "1753",
                "dep": "1753"
            },
            "st23": {
                "track": "2",
                "arr": "1801",
                "dep": "1801"
            },
            "st24": {
                "track": "2",
                "arr": "1805"
            }
        }
    },
    {
        "id": "t144",
        "trainNo": "",
        "duty": "",
        "type": "快速",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1738"
            },
            "st18": {
                "pass": true
            },
            "st19": {
                "track": "12通",
                "arr": "1746",
                "dep": "1746"
            },
            "st20": {
                "pass": true
            },
            "st21": {
                "track": "1",
                "arr": "1755",
                "dep": "1756"
            },
            "st22": {
                "pass": true
            },
            "st23": {
                "pass": true
            },
            "st24": {
                "track": "2",
                "arr": "1808"
            }
        }
    },
    {
        "id": "t145",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "1809"
            },
            "st25": {
                "track": "2",
                "arr": "1814",
                "dep": "1814"
            },
            "st26": {
                "track": "2",
                "arr": "1819",
                "dep": "1819"
            },
            "st27": {
                "track": "2",
                "arr": "1826",
                "dep": "1826"
            },
            "st28": {
                "track": "2",
                "arr": "1831",
                "dep": "1831"
            },
            "st29": {
                "track": "2",
                "arr": "1837",
                "dep": "1837"
            },
            "st30": {
                "track": "2",
                "arr": "1840",
                "dep": "1841"
            },
            "st31": {
                "track": "2",
                "arr": "1845",
                "dep": "1845"
            },
            "st32": {
                "track": "2",
                "arr": "1848",
                "dep": "1848"
            },
            "st33": {
                "track": "2",
                "arr": "1851"
            }
        }
    },
    {
        "id": "t146",
        "trainNo": "13M",
        "duty": "",
        "type": "特急",
        "name": "ひるかわ",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1550"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "1603",
                "dep": "1603"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "1613",
                "dep": "1613"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "1623"
            }
        }
    },
    {
        "id": "t147",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1600"
            },
            "st1": {
                "track": "2",
                "arr": "1604",
                "dep": "1604"
            },
            "st2": {
                "track": "12通",
                "arr": "1609",
                "dep": "1609"
            },
            "st3": {
                "track": "2",
                "arr": "1615",
                "dep": "1615"
            },
            "st4": {
                "track": "2",
                "arr": "1620",
                "dep": "1620"
            },
            "st5": {
                "track": "2",
                "arr": "1623",
                "dep": "1623"
            },
            "st6": {
                "track": "2",
                "arr": "1629",
                "dep": "1629"
            },
            "st7": {
                "track": "2",
                "arr": "1634",
                "dep": "1634"
            },
            "st8": {
                "track": "2",
                "arr": "1641",
                "dep": "1641"
            },
            "st9": {
                "track": "2",
                "arr": "1647",
                "dep": "1647"
            },
            "st10": {
                "track": "2",
                "arr": "1658",
                "dep": "1658"
            },
            "st11": {
                "track": "2通",
                "arr": "1710",
                "dep": "1710"
            },
            "st12": {
                "track": "2",
                "arr": "1719",
                "dep": "1719"
            },
            "st13": {
                "track": "2",
                "arr": "1726",
                "dep": "1726"
            },
            "st14": {
                "track": "2",
                "arr": "1732",
                "dep": "1732"
            },
            "st15": {
                "track": "2",
                "arr": "1737",
                "dep": "1737"
            },
            "st16": {
                "track": "2",
                "arr": "1742",
                "dep": "1742"
            },
            "st17": {
                "track": "2",
                "arr": "1745"
            }
        }
    },
    {
        "id": "t148",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1749"
            },
            "st18": {
                "track": "2",
                "arr": "1753",
                "dep": "1753"
            },
            "st19": {
                "track": "12通",
                "arr": "1759",
                "dep": "1759"
            },
            "st20": {
                "track": "2",
                "arr": "1805",
                "dep": "1805"
            },
            "st21": {
                "track": "1",
                "arr": "1810",
                "dep": "1811"
            },
            "st22": {
                "track": "2",
                "arr": "1817",
                "dep": "1817"
            },
            "st23": {
                "track": "2",
                "arr": "1825",
                "dep": "1825"
            },
            "st24": {
                "track": "2",
                "arr": "1829",
                "dep": "1830"
            },
            "st25": {
                "track": "2",
                "arr": "1835",
                "dep": "1835"
            },
            "st26": {
                "track": "2",
                "arr": "1840",
                "dep": "1840"
            },
            "st27": {
                "track": "2",
                "arr": "1847",
                "dep": "1847"
            },
            "st28": {
                "track": "2",
                "arr": "1852",
                "dep": "1852"
            },
            "st29": {
                "track": "2",
                "arr": "1858",
                "dep": "1858"
            },
            "st30": {
                "track": "2",
                "arr": "1901",
                "dep": "1902"
            },
            "st31": {
                "track": "2",
                "arr": "1906",
                "dep": "1906"
            },
            "st32": {
                "track": "2",
                "arr": "1909",
                "dep": "1909"
            },
            "st33": {
                "track": "2",
                "arr": "1912"
            }
        }
    },
    {
        "id": "t149",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1630"
            },
            "st1": {
                "track": "2",
                "arr": "1634",
                "dep": "1634"
            },
            "st2": {
                "track": "12通",
                "arr": "1639",
                "dep": "1639"
            },
            "st3": {
                "track": "2",
                "arr": "1645",
                "dep": "1645"
            },
            "st4": {
                "track": "2",
                "arr": "1650"
            }
        }
    },
    {
        "id": "t150",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "1756"
            },
            "st15": {
                "track": "2",
                "arr": "1800",
                "dep": "1801"
            },
            "st16": {
                "track": "2",
                "arr": "1805",
                "dep": "1806"
            },
            "st17": {
                "track": "2",
                "arr": "1809"
            }
        }
    },
    {
        "id": "t151",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1812"
            },
            "st18": {
                "track": "2",
                "arr": "1816",
                "dep": "1816"
            },
            "st19": {
                "track": "12通",
                "arr": "1822",
                "dep": "1822"
            },
            "st20": {
                "track": "2",
                "arr": "1828",
                "dep": "1828"
            },
            "st21": {
                "track": "1",
                "arr": "1833",
                "dep": "1834"
            },
            "st22": {
                "track": "2",
                "arr": "1840",
                "dep": "1840"
            },
            "st23": {
                "track": "2",
                "arr": "1848",
                "dep": "1848"
            },
            "st24": {
                "track": "2",
                "arr": "1852",
                "dep": "1853"
            },
            "st25": {
                "track": "2",
                "arr": "1858",
                "dep": "1858"
            },
            "st26": {
                "track": "2",
                "arr": "1903",
                "dep": "1903"
            },
            "st27": {
                "track": "2",
                "arr": "1910",
                "dep": "1910"
            },
            "st28": {
                "track": "2",
                "arr": "1915",
                "dep": "1915"
            },
            "st29": {
                "track": "2",
                "arr": "1921",
                "dep": "1921"
            },
            "st30": {
                "track": "2",
                "arr": "1924",
                "dep": "1925"
            },
            "st31": {
                "track": "2",
                "arr": "1929",
                "dep": "1929"
            },
            "st32": {
                "track": "2",
                "arr": "1932",
                "dep": "1932"
            },
            "st33": {
                "track": "2",
                "arr": "1935"
            }
        }
    },
    {
        "id": "t152",
        "trainNo": "9053M",
        "duty": "",
        "type": "快速",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1650"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "1703",
                "dep": "1703"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "1713",
                "dep": "1713"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "1723"
            }
        }
    },
    {
        "id": "t153",
        "trainNo": "",
        "duty": "",
        "type": "快速",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1700"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "track": "12通",
                "arr": "1707",
                "dep": "1707"
            },
            "st3": {
                "track": "2",
                "arr": "1713",
                "dep": "1713"
            },
            "st4": {
                "track": "2",
                "arr": "1718",
                "dep": "1718"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "1729",
                "dep": "1729"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "1740",
                "dep": "1740"
            },
            "st10": {
                "track": "2",
                "arr": "1751",
                "dep": "1751"
            },
            "st11": {
                "pass": true
            },
            "st12": {
                "track": "2",
                "arr": "1808",
                "dep": "1808"
            },
            "st13": {
                "pass": true
            },
            "st14": {
                "track": "2",
                "arr": "1819",
                "dep": "1819"
            },
            "st15": {
                "pass": true
            },
            "st16": {
                "pass": true
            },
            "st17": {
                "track": "2",
                "arr": "1829"
            }
        }
    },
    {
        "id": "t154",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1837"
            },
            "st18": {
                "track": "2",
                "arr": "1841",
                "dep": "1841"
            },
            "st19": {
                "track": "12通",
                "arr": "1847",
                "dep": "1847"
            },
            "st20": {
                "track": "2",
                "arr": "1853",
                "dep": "1853"
            },
            "st21": {
                "track": "1",
                "arr": "1858",
                "dep": "1859"
            },
            "st22": {
                "track": "2",
                "arr": "1905",
                "dep": "1905"
            },
            "st23": {
                "track": "2",
                "arr": "1913",
                "dep": "1913"
            },
            "st24": {
                "track": "2",
                "arr": "1917",
                "dep": "1918"
            },
            "st25": {
                "track": "2",
                "arr": "1923",
                "dep": "1923"
            },
            "st26": {
                "track": "2",
                "arr": "1928",
                "dep": "1928"
            },
            "st27": {
                "track": "2",
                "arr": "1935",
                "dep": "1935"
            },
            "st28": {
                "track": "2",
                "arr": "1940",
                "dep": "1940"
            },
            "st29": {
                "track": "2",
                "arr": "1946",
                "dep": "1946"
            },
            "st30": {
                "track": "2",
                "arr": "1949",
                "dep": "1950"
            },
            "st31": {
                "track": "2",
                "arr": "1954",
                "dep": "1954"
            },
            "st32": {
                "track": "2",
                "arr": "1957",
                "dep": "1957"
            },
            "st33": {
                "track": "2",
                "arr": "2000"
            }
        }
    },
    {
        "id": "t155",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "1812"
            },
            "st13": {
                "track": "2",
                "arr": "1819",
                "dep": "1819"
            },
            "st14": {
                "track": "2",
                "arr": "1825",
                "dep": "1825"
            },
            "st15": {
                "track": "2",
                "arr": "1830",
                "dep": "1830"
            },
            "st16": {
                "track": "2",
                "arr": "1835",
                "dep": "1835"
            },
            "st17": {
                "track": "2",
                "arr": "1838"
            }
        }
    },
    {
        "id": "t156",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1859"
            },
            "st18": {
                "track": "2",
                "arr": "1903",
                "dep": "1903"
            },
            "st19": {
                "track": "12通",
                "arr": "1909",
                "dep": "1909"
            },
            "st20": {
                "track": "2",
                "arr": "1915",
                "dep": "1915"
            },
            "st21": {
                "track": "1",
                "arr": "1920",
                "dep": "1921"
            },
            "st22": {
                "track": "2",
                "arr": "1927",
                "dep": "1927"
            },
            "st23": {
                "track": "2",
                "arr": "1935",
                "dep": "1935"
            },
            "st24": {
                "track": "2",
                "arr": "1939",
                "dep": "1940"
            },
            "st25": {
                "track": "2",
                "arr": "1945",
                "dep": "1945"
            },
            "st26": {
                "track": "2",
                "arr": "1950",
                "dep": "1950"
            },
            "st27": {
                "track": "2",
                "arr": "1957",
                "dep": "1957"
            },
            "st28": {
                "track": "2",
                "arr": "2002",
                "dep": "2002"
            },
            "st29": {
                "track": "2",
                "arr": "2008",
                "dep": "2008"
            },
            "st30": {
                "track": "2",
                "arr": "2011",
                "dep": "2012"
            },
            "st31": {
                "track": "2",
                "arr": "2016",
                "dep": "2016"
            },
            "st32": {
                "track": "2",
                "arr": "2019",
                "dep": "2019"
            },
            "st33": {
                "track": "2",
                "arr": "2022"
            }
        }
    },
    {
        "id": "t157",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1713"
            },
            "st1": {
                "track": "2",
                "arr": "1717",
                "dep": "1717"
            },
            "st2": {
                "track": "12通",
                "arr": "1722",
                "dep": "1722"
            },
            "st3": {
                "track": "2",
                "arr": "1728",
                "dep": "1728"
            },
            "st4": {
                "track": "2",
                "arr": "1733",
                "dep": "1733"
            },
            "st5": {
                "track": "2",
                "arr": "1736",
                "dep": "1736"
            },
            "st6": {
                "track": "2",
                "arr": "1742",
                "dep": "1742"
            },
            "st7": {
                "track": "2",
                "arr": "1747",
                "dep": "1747"
            },
            "st8": {
                "track": "2",
                "arr": "1754",
                "dep": "1754"
            },
            "st9": {
                "track": "2",
                "arr": "1800"
            }
        }
    },
    {
        "id": "t158",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "1840"
            },
            "st15": {
                "track": "2",
                "arr": "1844",
                "dep": "1845"
            },
            "st16": {
                "track": "2",
                "arr": "1849",
                "dep": "1850"
            },
            "st17": {
                "track": "2",
                "arr": "1853"
            }
        }
    },
    {
        "id": "t159",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1921"
            },
            "st18": {
                "track": "2",
                "arr": "1925",
                "dep": "1925"
            },
            "st19": {
                "track": "12通",
                "arr": "1931",
                "dep": "1931"
            },
            "st20": {
                "track": "2",
                "arr": "1937",
                "dep": "1937"
            },
            "st21": {
                "track": "1",
                "arr": "1942",
                "dep": "1943"
            },
            "st22": {
                "track": "2",
                "arr": "1949",
                "dep": "1949"
            },
            "st23": {
                "track": "2",
                "arr": "1957",
                "dep": "1957"
            },
            "st24": {
                "track": "2",
                "arr": "2001",
                "dep": "2002"
            },
            "st25": {
                "track": "2",
                "arr": "2007",
                "dep": "2007"
            },
            "st26": {
                "track": "2",
                "arr": "2012",
                "dep": "2012"
            },
            "st27": {
                "track": "2",
                "arr": "2019",
                "dep": "2019"
            },
            "st28": {
                "track": "2",
                "arr": "2024",
                "dep": "2024"
            },
            "st29": {
                "track": "2",
                "arr": "2030",
                "dep": "2030"
            },
            "st30": {
                "track": "2",
                "arr": "2033",
                "dep": "2034"
            },
            "st31": {
                "track": "2",
                "arr": "2038",
                "dep": "2038"
            },
            "st32": {
                "track": "2",
                "arr": "2041",
                "dep": "2041"
            },
            "st33": {
                "track": "2",
                "arr": "2044"
            }
        }
    },
    {
        "id": "t160",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1740"
            },
            "st1": {
                "track": "2",
                "arr": "1744",
                "dep": "1744"
            },
            "st2": {
                "track": "12通",
                "arr": "1749",
                "dep": "1749"
            },
            "st3": {
                "track": "2",
                "arr": "1755",
                "dep": "1755"
            },
            "st4": {
                "track": "2",
                "arr": "1800"
            }
        }
    },
    {
        "id": "t161",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "1917"
            },
            "st15": {
                "track": "2",
                "arr": "1921",
                "dep": "1922"
            },
            "st16": {
                "track": "2",
                "arr": "1926",
                "dep": "1927"
            },
            "st17": {
                "track": "2",
                "arr": "1930"
            }
        }
    },
    {
        "id": "t162",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "1941"
            },
            "st18": {
                "track": "2",
                "arr": "1945",
                "dep": "1945"
            },
            "st19": {
                "track": "12通",
                "arr": "1951",
                "dep": "1951"
            },
            "st20": {
                "track": "2",
                "arr": "1957",
                "dep": "1957"
            },
            "st21": {
                "track": "1",
                "arr": "2002",
                "dep": "2003"
            },
            "st22": {
                "track": "2",
                "arr": "2009",
                "dep": "2009"
            },
            "st23": {
                "track": "2",
                "arr": "2017",
                "dep": "2017"
            },
            "st24": {
                "track": "2",
                "arr": "2021",
                "dep": "2023"
            },
            "st25": {
                "track": "2",
                "arr": "2028",
                "dep": "2028"
            },
            "st26": {
                "track": "2",
                "arr": "2033",
                "dep": "2033"
            },
            "st27": {
                "track": "2",
                "arr": "2040",
                "dep": "2040"
            },
            "st28": {
                "track": "2",
                "arr": "2045",
                "dep": "2045"
            },
            "st29": {
                "track": "2",
                "arr": "2051",
                "dep": "2051"
            },
            "st30": {
                "track": "2",
                "arr": "2054",
                "dep": "2055"
            },
            "st31": {
                "track": "2",
                "arr": "2059",
                "dep": "2059"
            },
            "st32": {
                "track": "2",
                "arr": "2102",
                "dep": "2102"
            },
            "st33": {
                "track": "2",
                "arr": "2105"
            }
        }
    },
    {
        "id": "t163",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1805"
            },
            "st1": {
                "track": "2",
                "arr": "1809",
                "dep": "1809"
            },
            "st2": {
                "track": "12通",
                "arr": "1814",
                "dep": "1814"
            },
            "st3": {
                "track": "2",
                "arr": "1820",
                "dep": "1820"
            },
            "st4": {
                "track": "2",
                "arr": "1825",
                "dep": "1825"
            },
            "st5": {
                "track": "2",
                "arr": "1828",
                "dep": "1828"
            },
            "st6": {
                "track": "2",
                "arr": "1834",
                "dep": "1834"
            },
            "st7": {
                "track": "2",
                "arr": "1839",
                "dep": "1839"
            },
            "st8": {
                "track": "2",
                "arr": "1846",
                "dep": "1846"
            },
            "st9": {
                "track": "2",
                "arr": "1852",
                "dep": "1852"
            },
            "st10": {
                "track": "2",
                "arr": "1903",
                "dep": "1903"
            },
            "st11": {
                "track": "2通",
                "arr": "1915",
                "dep": "1915"
            },
            "st12": {
                "track": "2",
                "arr": "1924",
                "dep": "1924"
            },
            "st13": {
                "track": "2",
                "arr": "1931",
                "dep": "1931"
            },
            "st14": {
                "track": "2",
                "arr": "1937",
                "dep": "1937"
            },
            "st15": {
                "track": "2",
                "arr": "1942",
                "dep": "1942"
            },
            "st16": {
                "track": "2",
                "arr": "1947",
                "dep": "1947"
            },
            "st17": {
                "track": "2",
                "arr": "1950"
            }
        }
    },
    {
        "id": "t164",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "2004"
            },
            "st18": {
                "track": "2",
                "arr": "2008",
                "dep": "2008"
            },
            "st19": {
                "track": "12通",
                "arr": "2014",
                "dep": "2014"
            },
            "st20": {
                "track": "2",
                "arr": "2020",
                "dep": "2020"
            },
            "st21": {
                "track": "1",
                "arr": "2025",
                "dep": "2026"
            },
            "st22": {
                "track": "2",
                "arr": "2032",
                "dep": "2032"
            },
            "st23": {
                "track": "2",
                "arr": "2040",
                "dep": "2040"
            },
            "st24": {
                "track": "2",
                "arr": "2044",
                "dep": "2045"
            },
            "st25": {
                "track": "2",
                "arr": "2050",
                "dep": "2050"
            },
            "st26": {
                "track": "2",
                "arr": "2055",
                "dep": "2055"
            },
            "st27": {
                "track": "2",
                "arr": "2102",
                "dep": "2102"
            },
            "st28": {
                "track": "2",
                "arr": "2107",
                "dep": "2107"
            },
            "st29": {
                "track": "2",
                "arr": "2113",
                "dep": "2113"
            },
            "st30": {
                "track": "2",
                "arr": "2116",
                "dep": "2117"
            },
            "st31": {
                "track": "2",
                "arr": "2121",
                "dep": "2121"
            },
            "st32": {
                "track": "2",
                "arr": "2124",
                "dep": "2124"
            },
            "st33": {
                "track": "2",
                "arr": "2127"
            }
        }
    },
    {
        "id": "t165",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1825"
            },
            "st1": {
                "track": "2",
                "arr": "1829",
                "dep": "1829"
            },
            "st2": {
                "track": "12通",
                "arr": "1834",
                "dep": "1834"
            },
            "st3": {
                "track": "2",
                "arr": "1840",
                "dep": "1840"
            },
            "st4": {
                "track": "2",
                "arr": "1845"
            }
        }
    },
    {
        "id": "t166",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "横賀",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1840"
            },
            "st1": {
                "track": "2",
                "arr": "1844",
                "dep": "1844"
            },
            "st2": {
                "track": "12通",
                "arr": "1849",
                "dep": "1849"
            },
            "st3": {
                "track": "2",
                "arr": "1855",
                "dep": "1855"
            },
            "st4": {
                "track": "2",
                "arr": "1900",
                "dep": "1900"
            },
            "st5": {
                "track": "2",
                "arr": "1903",
                "dep": "1903"
            },
            "st6": {
                "track": "2",
                "arr": "1909",
                "dep": "1909"
            },
            "st7": {
                "track": "2",
                "arr": "1914"
            }
        }
    },
    {
        "id": "t167",
        "trainNo": "19M",
        "duty": "",
        "type": "特急",
        "name": "むろかわ",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1900"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "1913",
                "dep": "1913"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "1923",
                "dep": "1923"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "pass": true
            },
            "st10": {
                "track": "2",
                "arr": "1938",
                "dep": "1938"
            },
            "st11": {
                "pass": true
            },
            "st12": {
                "track": "2",
                "arr": "1953",
                "dep": "1953"
            },
            "st13": {
                "pass": true
            },
            "st14": {
                "track": "2",
                "arr": "2002",
                "dep": "2002"
            },
            "st15": {
                "pass": true
            },
            "st16": {
                "pass": true
            },
            "st17": {
                "track": "2",
                "arr": "2011"
            }
        }
    },
    {
        "id": "t168",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "1957"
            },
            "st13": {
                "track": "2",
                "arr": "2004",
                "dep": "2004"
            },
            "st14": {
                "track": "2",
                "arr": "2010",
                "dep": "2010"
            },
            "st15": {
                "track": "2",
                "arr": "2015",
                "dep": "2015"
            },
            "st16": {
                "track": "2",
                "arr": "2020",
                "dep": "2020"
            },
            "st17": {
                "track": "2",
                "arr": "2023"
            }
        }
    },
    {
        "id": "t169",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "2025"
            },
            "st18": {
                "track": "2",
                "arr": "2029",
                "dep": "2029"
            },
            "st19": {
                "track": "12通",
                "arr": "2035",
                "dep": "2035"
            },
            "st20": {
                "track": "2",
                "arr": "2041",
                "dep": "2041"
            },
            "st21": {
                "track": "1",
                "arr": "2046",
                "dep": "2047"
            },
            "st22": {
                "track": "2",
                "arr": "2053",
                "dep": "2053"
            },
            "st23": {
                "track": "2",
                "arr": "2101",
                "dep": "2101"
            },
            "st24": {
                "track": "2",
                "arr": "2105",
                "dep": "2106"
            },
            "st25": {
                "track": "2",
                "arr": "2111",
                "dep": "2111"
            },
            "st26": {
                "track": "2",
                "arr": "2116",
                "dep": "2116"
            },
            "st27": {
                "track": "2",
                "arr": "2123",
                "dep": "2123"
            },
            "st28": {
                "track": "2",
                "arr": "2128",
                "dep": "2128"
            },
            "st29": {
                "track": "2",
                "arr": "2134",
                "dep": "2134"
            },
            "st30": {
                "track": "2",
                "arr": "2137",
                "dep": "2138"
            },
            "st31": {
                "track": "2",
                "arr": "2142",
                "dep": "2142"
            },
            "st32": {
                "track": "2",
                "arr": "2145",
                "dep": "2145"
            },
            "st33": {
                "track": "2",
                "arr": "2148"
            }
        }
    },
    {
        "id": "t170",
        "trainNo": "",
        "duty": "",
        "type": "回送",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "2020"
            },
            "st15": {
                "pass": true
            },
            "st16": {
                "pass": true
            },
            "st17": {
                "track": "2",
                "arr": "2033"
            }
        }
    },
    {
        "id": "t171",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "2047"
            },
            "st18": {
                "track": "2",
                "arr": "2051",
                "dep": "2051"
            },
            "st19": {
                "track": "12通",
                "arr": "2057",
                "dep": "2057"
            },
            "st20": {
                "track": "2",
                "arr": "2103",
                "dep": "2103"
            },
            "st21": {
                "track": "1",
                "arr": "2108",
                "dep": "2109"
            },
            "st22": {
                "track": "2",
                "arr": "2115",
                "dep": "2115"
            },
            "st23": {
                "track": "2",
                "arr": "2123",
                "dep": "2123"
            },
            "st24": {
                "track": "2",
                "arr": "2127",
                "dep": "2128"
            },
            "st25": {
                "track": "2",
                "arr": "2133",
                "dep": "2133"
            },
            "st26": {
                "track": "2",
                "arr": "2138",
                "dep": "2138"
            },
            "st27": {
                "track": "2",
                "arr": "2145",
                "dep": "2145"
            },
            "st28": {
                "track": "2",
                "arr": "2150",
                "dep": "2150"
            },
            "st29": {
                "track": "2",
                "arr": "2156",
                "dep": "2156"
            },
            "st30": {
                "track": "2",
                "arr": "2159",
                "dep": "2200"
            },
            "st31": {
                "track": "2",
                "arr": "2204",
                "dep": "2204"
            },
            "st32": {
                "track": "2",
                "arr": "2207",
                "dep": "2207"
            },
            "st33": {
                "track": "2",
                "arr": "2210"
            }
        }
    },
    {
        "id": "t172",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1908"
            },
            "st1": {
                "track": "2",
                "arr": "1912",
                "dep": "1912"
            },
            "st2": {
                "track": "12通",
                "arr": "1917",
                "dep": "1917"
            },
            "st3": {
                "track": "2",
                "arr": "1923",
                "dep": "1923"
            },
            "st4": {
                "track": "2",
                "arr": "1928",
                "dep": "1928"
            },
            "st5": {
                "track": "2",
                "arr": "1931",
                "dep": "1931"
            },
            "st6": {
                "track": "2",
                "arr": "1937",
                "dep": "1937"
            },
            "st7": {
                "track": "2",
                "arr": "1942",
                "dep": "1942"
            },
            "st8": {
                "track": "2",
                "arr": "1949",
                "dep": "1949"
            },
            "st9": {
                "track": "2",
                "arr": "1955"
            }
        }
    },
    {
        "id": "t173",
        "trainNo": "",
        "duty": "",
        "type": "快速",
        "name": "",
        "startStation": "横賀",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st7": {
                "track": "2",
                "dep": "1950"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "2001",
                "dep": "2001"
            },
            "st10": {
                "track": "2",
                "arr": "2012",
                "dep": "2012"
            },
            "st11": {
                "track": "2通",
                "arr": "2024",
                "dep": "2024"
            },
            "st12": {
                "track": "2",
                "arr": "2033",
                "dep": "2033"
            },
            "st13": {
                "track": "2",
                "arr": "2040",
                "dep": "2040"
            },
            "st14": {
                "track": "2",
                "arr": "2046",
                "dep": "2046"
            },
            "st15": {
                "track": "2",
                "arr": "2051",
                "dep": "2051"
            },
            "st16": {
                "track": "2",
                "arr": "2056",
                "dep": "2056"
            },
            "st17": {
                "track": "2",
                "arr": "2059"
            }
        }
    },
    {
        "id": "t174",
        "trainNo": "931D",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "2110"
            },
            "st18": {
                "track": "2",
                "arr": "2114",
                "dep": "2115"
            },
            "st19": {
                "track": "12通",
                "arr": "2120",
                "dep": "2121"
            },
            "st20": {
                "track": "2",
                "arr": "2126",
                "dep": "2127"
            },
            "st21": {
                "track": "1",
                "arr": "2131",
                "dep": "2132"
            },
            "st22": {
                "track": "2",
                "arr": "2138",
                "dep": "2138"
            },
            "st23": {
                "track": "2",
                "arr": "2146",
                "dep": "2146"
            },
            "st24": {
                "track": "2",
                "arr": "2150"
            }
        }
    },
    {
        "id": "t175",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "加磨",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st24": {
                "track": "2",
                "dep": "2155"
            },
            "st25": {
                "track": "2",
                "arr": "2200",
                "dep": "2200"
            },
            "st26": {
                "track": "2",
                "arr": "2205",
                "dep": "2205"
            },
            "st27": {
                "track": "2",
                "arr": "2212",
                "dep": "2212"
            },
            "st28": {
                "track": "2",
                "arr": "2217",
                "dep": "2217"
            },
            "st29": {
                "track": "2",
                "arr": "2223",
                "dep": "2223"
            },
            "st30": {
                "track": "2",
                "arr": "2226",
                "dep": "2227"
            },
            "st31": {
                "track": "2",
                "arr": "2231",
                "dep": "2231"
            },
            "st32": {
                "track": "2",
                "arr": "2234",
                "dep": "2234"
            },
            "st33": {
                "track": "2",
                "arr": "2237"
            }
        }
    },
    {
        "id": "t176",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "横賀",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "1940"
            },
            "st1": {
                "track": "2",
                "arr": "1944",
                "dep": "1944"
            },
            "st2": {
                "track": "12通",
                "arr": "1949",
                "dep": "1949"
            },
            "st3": {
                "track": "2",
                "arr": "1955",
                "dep": "1955"
            },
            "st4": {
                "track": "2",
                "arr": "2000",
                "dep": "2000"
            },
            "st5": {
                "track": "2",
                "arr": "2003",
                "dep": "2003"
            },
            "st6": {
                "track": "2",
                "arr": "2009",
                "dep": "2009"
            },
            "st7": {
                "track": "2",
                "arr": "2014"
            }
        }
    },
    {
        "id": "t177",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "2114"
            },
            "st15": {
                "track": "2",
                "arr": "2119",
                "dep": "2119"
            },
            "st16": {
                "track": "2",
                "arr": "2124",
                "dep": "2124"
            },
            "st17": {
                "track": "2",
                "arr": "2127"
            }
        }
    },
    {
        "id": "t178",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "2135"
            },
            "st18": {
                "track": "2",
                "arr": "2139",
                "dep": "2139"
            },
            "st19": {
                "track": "12通",
                "arr": "2145",
                "dep": "2145"
            },
            "st20": {
                "track": "2",
                "arr": "2151",
                "dep": "2151"
            },
            "st21": {
                "track": "1",
                "arr": "2156",
                "dep": "2157"
            },
            "st22": {
                "track": "2",
                "arr": "2203",
                "dep": "2203"
            },
            "st23": {
                "track": "2",
                "arr": "2211",
                "dep": "2211"
            },
            "st24": {
                "track": "2",
                "arr": "2215",
                "dep": "2218"
            },
            "st25": {
                "track": "2",
                "arr": "2223",
                "dep": "2223"
            },
            "st26": {
                "track": "2",
                "arr": "2228",
                "dep": "2228"
            },
            "st27": {
                "track": "2",
                "arr": "2235",
                "dep": "2235"
            },
            "st28": {
                "track": "2",
                "arr": "2240",
                "dep": "2240"
            },
            "st29": {
                "track": "2",
                "arr": "2246",
                "dep": "2246"
            },
            "st30": {
                "track": "2",
                "arr": "2249",
                "dep": "2250"
            },
            "st31": {
                "track": "2",
                "arr": "2254",
                "dep": "2254"
            },
            "st32": {
                "track": "2",
                "arr": "2257",
                "dep": "2257"
            },
            "st33": {
                "track": "2",
                "arr": "2300"
            }
        }
    },
    {
        "id": "t179",
        "trainNo": "17M",
        "duty": "",
        "type": "特急",
        "name": "ひるかわ",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2000"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "track": "12通",
                "arr": "2006",
                "dep": "2006"
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "2015",
                "dep": "2015"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "2025",
                "dep": "2025"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "2035"
            }
        }
    },
    {
        "id": "t180",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2011"
            },
            "st1": {
                "track": "2",
                "arr": "2015",
                "dep": "2015"
            },
            "st2": {
                "track": "12通",
                "arr": "2020",
                "dep": "2020"
            },
            "st3": {
                "track": "2",
                "arr": "2026",
                "dep": "2026"
            },
            "st4": {
                "track": "2",
                "arr": "2031",
                "dep": "2031"
            },
            "st5": {
                "track": "2",
                "arr": "2034",
                "dep": "2034"
            },
            "st6": {
                "track": "2",
                "arr": "2040",
                "dep": "2040"
            },
            "st7": {
                "track": "2",
                "arr": "2045",
                "dep": "2045"
            },
            "st8": {
                "track": "2",
                "arr": "2052",
                "dep": "2052"
            },
            "st9": {
                "track": "2",
                "arr": "2058",
                "dep": "2058"
            },
            "st10": {
                "track": "2",
                "arr": "2109",
                "dep": "2109"
            },
            "st11": {
                "track": "2通",
                "arr": "2121",
                "dep": "2121"
            },
            "st12": {
                "track": "2",
                "arr": "2130",
                "dep": "2130"
            },
            "st13": {
                "track": "2",
                "arr": "2137",
                "dep": "2137"
            },
            "st14": {
                "track": "2",
                "arr": "2143",
                "dep": "2143"
            },
            "st15": {
                "track": "2",
                "arr": "2148",
                "dep": "2148"
            },
            "st16": {
                "track": "2",
                "arr": "2153",
                "dep": "2153"
            },
            "st17": {
                "track": "2",
                "arr": "2156"
            }
        }
    },
    {
        "id": "t181",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "2200"
            },
            "st18": {
                "track": "2",
                "arr": "2204",
                "dep": "2204"
            },
            "st19": {
                "track": "12通",
                "arr": "2210",
                "dep": "2210"
            },
            "st20": {
                "track": "2",
                "arr": "2216",
                "dep": "2216"
            },
            "st21": {
                "track": "1",
                "arr": "2221",
                "dep": "2222"
            },
            "st22": {
                "track": "2",
                "arr": "2228",
                "dep": "2228"
            },
            "st23": {
                "track": "2",
                "arr": "2236",
                "dep": "2236"
            },
            "st24": {
                "track": "2",
                "arr": "2240",
                "dep": "2241"
            },
            "st25": {
                "track": "2",
                "arr": "2246",
                "dep": "2246"
            },
            "st26": {
                "track": "2",
                "arr": "2251",
                "dep": "2251"
            },
            "st27": {
                "track": "2",
                "arr": "2258",
                "dep": "2258"
            },
            "st28": {
                "track": "2",
                "arr": "2303",
                "dep": "2303"
            },
            "st29": {
                "track": "2",
                "arr": "2309",
                "dep": "2309"
            },
            "st30": {
                "track": "2",
                "arr": "2312",
                "dep": "2313"
            },
            "st31": {
                "track": "2",
                "arr": "2317",
                "dep": "2317"
            },
            "st32": {
                "track": "2",
                "arr": "2320",
                "dep": "2320"
            },
            "st33": {
                "track": "2",
                "arr": "2323"
            }
        }
    },
    {
        "id": "t182",
        "trainNo": "1001",
        "duty": "",
        "type": "寝台特急",
        "name": "さと",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2030"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "2045",
                "dep": "2045"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "2058",
                "dep": "2100"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "pass": true
            },
            "st10": {
                "track": "2",
                "arr": "2124",
                "dep": "2124"
            },
            "st11": {
                "pass": true
            },
            "st12": {
                "pass": true
            },
            "st13": {
                "pass": true
            },
            "st14": {
                "pass": true
            },
            "st15": {
                "pass": true
            },
            "st16": {
                "pass": true
            },
            "st17": {
                "track": "2",
                "arr": "2202",
                "dep": "2215"
            },
            "st49": {
                "arr": "120",
                "dep": "121"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "137",
                "dep": "142"
            }
        }
    },
    {
        "id": "t183",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2037"
            },
            "st1": {
                "track": "2",
                "arr": "2041",
                "dep": "2041"
            },
            "st2": {
                "track": "12通",
                "arr": "2046",
                "dep": "2046"
            },
            "st3": {
                "track": "2",
                "arr": "2052",
                "dep": "2052"
            },
            "st4": {
                "track": "2",
                "arr": "2057"
            }
        }
    },
    {
        "id": "t184",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "2146"
            },
            "st13": {
                "track": "2",
                "arr": "2153",
                "dep": "2153"
            },
            "st14": {
                "track": "2",
                "arr": "2159",
                "dep": "2159"
            },
            "st15": {
                "track": "2",
                "arr": "2204",
                "dep": "2204"
            },
            "st16": {
                "track": "2",
                "arr": "2209",
                "dep": "2209"
            },
            "st17": {
                "track": "2",
                "arr": "2212"
            }
        }
    },
    {
        "id": "t185",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "2225"
            },
            "st18": {
                "track": "2",
                "arr": "2229",
                "dep": "2229"
            },
            "st19": {
                "track": "12通",
                "arr": "2235",
                "dep": "2235"
            },
            "st20": {
                "track": "2",
                "arr": "2241",
                "dep": "2241"
            },
            "st21": {
                "track": "1",
                "arr": "2246",
                "dep": "2247"
            },
            "st22": {
                "track": "2",
                "arr": "2253",
                "dep": "2253"
            },
            "st23": {
                "track": "2",
                "arr": "2301",
                "dep": "2301"
            },
            "st24": {
                "track": "2",
                "arr": "2305",
                "dep": "2306"
            },
            "st25": {
                "track": "2",
                "arr": "2311",
                "dep": "2311"
            },
            "st26": {
                "track": "2",
                "arr": "2316",
                "dep": "2316"
            },
            "st27": {
                "track": "2",
                "arr": "2323",
                "dep": "2323"
            },
            "st28": {
                "track": "2",
                "arr": "2328",
                "dep": "2328"
            },
            "st29": {
                "track": "2",
                "arr": "2334",
                "dep": "2334"
            },
            "st30": {
                "track": "2",
                "arr": "2337",
                "dep": "2338"
            },
            "st31": {
                "track": "2",
                "arr": "2342",
                "dep": "2342"
            },
            "st32": {
                "track": "2",
                "arr": "2345",
                "dep": "2345"
            },
            "st33": {
                "track": "2",
                "arr": "2348"
            }
        }
    },
    {
        "id": "t186",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "横賀",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2054"
            },
            "st1": {
                "track": "2",
                "arr": "2058",
                "dep": "2058"
            },
            "st2": {
                "track": "12通",
                "arr": "2103",
                "dep": "2103"
            },
            "st3": {
                "track": "2",
                "arr": "2109",
                "dep": "2109"
            },
            "st4": {
                "track": "2",
                "arr": "2114",
                "dep": "2114"
            },
            "st5": {
                "track": "2",
                "arr": "2117",
                "dep": "2117"
            },
            "st6": {
                "track": "2",
                "arr": "2123",
                "dep": "2123"
            },
            "st7": {
                "track": "2",
                "arr": "2128"
            }
        }
    },
    {
        "id": "t187",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "2230"
            },
            "st15": {
                "track": "2",
                "arr": "2235",
                "dep": "2235"
            },
            "st16": {
                "track": "2",
                "arr": "2240",
                "dep": "2240"
            },
            "st17": {
                "track": "2",
                "arr": "2243"
            }
        }
    },
    {
        "id": "t188",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "桐屋",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "2245"
            },
            "st18": {
                "track": "2",
                "arr": "2249",
                "dep": "2249"
            },
            "st19": {
                "track": "12通",
                "arr": "2255",
                "dep": "2255"
            },
            "st20": {
                "track": "2",
                "arr": "2301",
                "dep": "2301"
            },
            "st21": {
                "track": "1",
                "arr": "2306",
                "dep": "2307"
            },
            "st22": {
                "track": "2",
                "arr": "2313",
                "dep": "2313"
            },
            "st23": {
                "track": "2",
                "arr": "2321",
                "dep": "2321"
            },
            "st24": {
                "track": "2",
                "arr": "2325",
                "dep": "2326"
            },
            "st25": {
                "track": "2",
                "arr": "2331",
                "dep": "2331"
            },
            "st26": {
                "track": "2",
                "arr": "2336",
                "dep": "2336"
            },
            "st27": {
                "track": "2",
                "arr": "2343",
                "dep": "2343"
            },
            "st28": {
                "track": "2",
                "arr": "2348",
                "dep": "2348"
            },
            "st29": {
                "track": "2",
                "arr": "2354",
                "dep": "2354"
            },
            "st30": {
                "track": "2",
                "arr": "2357",
                "dep": "2358"
            },
            "st31": {
                "track": "2",
                "arr": "002",
                "dep": "002"
            },
            "st32": {
                "track": "2",
                "arr": "005",
                "dep": "005"
            },
            "st33": {
                "track": "2",
                "arr": "008"
            }
        }
    },
    {
        "id": "t189",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2110"
            },
            "st1": {
                "track": "2",
                "arr": "2114",
                "dep": "2114"
            },
            "st2": {
                "track": "12通",
                "arr": "2119",
                "dep": "2119"
            },
            "st3": {
                "track": "2",
                "arr": "2125",
                "dep": "2125"
            },
            "st4": {
                "track": "2",
                "arr": "2130",
                "dep": "2130"
            },
            "st5": {
                "track": "2",
                "arr": "2133",
                "dep": "2133"
            },
            "st6": {
                "track": "2",
                "arr": "2139",
                "dep": "2139"
            },
            "st7": {
                "track": "2",
                "arr": "2144",
                "dep": "2144"
            },
            "st8": {
                "track": "2",
                "arr": "2151",
                "dep": "2151"
            },
            "st9": {
                "track": "2",
                "arr": "2157"
            }
        }
    },
    {
        "id": "t190",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2135"
            },
            "st1": {
                "track": "2",
                "arr": "2139",
                "dep": "2139"
            },
            "st2": {
                "track": "12通",
                "arr": "2144",
                "dep": "2144"
            },
            "st3": {
                "track": "2",
                "arr": "2150",
                "dep": "2150"
            },
            "st4": {
                "track": "2",
                "arr": "2155"
            }
        }
    },
    {
        "id": "t191",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "淡海一宮",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "2300"
            },
            "st18": {
                "track": "2",
                "arr": "2304",
                "dep": "2305"
            },
            "st19": {
                "track": "12通",
                "arr": "2310",
                "dep": "2311"
            },
            "st20": {
                "track": "2",
                "arr": "2316",
                "dep": "2317"
            },
            "st21": {
                "track": "1",
                "arr": "2321"
            }
        }
    },
    {
        "id": "t192",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "2320"
            },
            "st18": {
                "track": "2",
                "arr": "2324",
                "dep": "2324"
            },
            "st19": {
                "track": "12通",
                "arr": "2330",
                "dep": "2330"
            },
            "st20": {
                "track": "2",
                "arr": "2336",
                "dep": "2336"
            },
            "st21": {
                "track": "1",
                "arr": "2341",
                "dep": "2342"
            },
            "st22": {
                "track": "2",
                "arr": "2348",
                "dep": "2348"
            },
            "st23": {
                "track": "2",
                "arr": "2356",
                "dep": "2356"
            },
            "st24": {
                "track": "2",
                "arr": "000"
            }
        }
    },
    {
        "id": "t193",
        "trainNo": "25M",
        "duty": "",
        "type": "特急",
        "name": "ひるかわ",
        "number": "9",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2150"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "track": "12通",
                "arr": "2156",
                "dep": "2156"
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "2205",
                "dep": "2205"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "2215",
                "dep": "2215"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "2225"
            }
        }
    },
    {
        "id": "t194",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2200"
            },
            "st1": {
                "track": "2",
                "arr": "2204",
                "dep": "2204"
            },
            "st2": {
                "track": "12通",
                "arr": "2209",
                "dep": "2209"
            },
            "st3": {
                "track": "2",
                "arr": "2215",
                "dep": "2215"
            },
            "st4": {
                "track": "2",
                "arr": "2220",
                "dep": "2220"
            },
            "st5": {
                "track": "2",
                "arr": "2223",
                "dep": "2223"
            },
            "st6": {
                "track": "2",
                "arr": "2229",
                "dep": "2229"
            },
            "st7": {
                "track": "2",
                "arr": "2234",
                "dep": "2234"
            },
            "st8": {
                "track": "2",
                "arr": "2241",
                "dep": "2241"
            },
            "st9": {
                "track": "2",
                "arr": "2247",
                "dep": "2247"
            },
            "st10": {
                "track": "2",
                "arr": "2258",
                "dep": "2258"
            },
            "st11": {
                "track": "2通",
                "arr": "2310",
                "dep": "2310"
            },
            "st12": {
                "track": "2",
                "arr": "2319",
                "dep": "2319"
            },
            "st13": {
                "track": "2",
                "arr": "2326",
                "dep": "2326"
            },
            "st14": {
                "track": "2",
                "arr": "2332",
                "dep": "2332"
            },
            "st15": {
                "track": "2",
                "arr": "2337",
                "dep": "2337"
            },
            "st16": {
                "track": "2",
                "arr": "2342",
                "dep": "2342"
            },
            "st17": {
                "track": "2",
                "arr": "2345"
            }
        }
    },
    {
        "id": "t195",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "江乃原",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st17": {
                "track": "2",
                "dep": "2350"
            },
            "st18": {
                "track": "2",
                "arr": "2354",
                "dep": "2354"
            },
            "st19": {
                "track": "12通",
                "arr": "000",
                "dep": "000"
            },
            "st20": {
                "track": "2",
                "arr": "006",
                "dep": "006"
            },
            "st21": {
                "track": "1",
                "arr": "011",
                "dep": "012"
            },
            "st22": {
                "track": "2",
                "arr": "018",
                "dep": "018"
            },
            "st23": {
                "track": "2",
                "arr": "026",
                "dep": "026"
            },
            "st24": {
                "track": "2",
                "arr": "030"
            }
        }
    },
    {
        "id": "t196",
        "trainNo": "",
        "duty": "",
        "type": "回送",
        "name": "",
        "startStation": "淡海田原",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st14": {
                "track": "2",
                "dep": "2340"
            },
            "st15": {
                "pass": true
            },
            "st16": {
                "pass": true
            },
            "st17": {
                "track": "2",
                "arr": "2353"
            }
        }
    },
    {
        "id": "t197",
        "trainNo": "1003",
        "duty": "",
        "type": "寝台特急",
        "name": "さと",
        "number": "3",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2230"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "2245",
                "dep": "2245"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "2258",
                "dep": "2300"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "pass": true
            },
            "st10": {
                "track": "2",
                "arr": "2324",
                "dep": "2324"
            },
            "st11": {
                "pass": true
            },
            "st12": {
                "pass": true
            },
            "st13": {
                "pass": true
            },
            "st14": {
                "pass": true
            },
            "st15": {
                "pass": true
            },
            "st16": {
                "pass": true
            },
            "st17": {
                "track": "2",
                "arr": "002",
                "dep": "006"
            },
            "st18": {
                "pass": true
            },
            "st19": {
                "pass": true
            },
            "st20": {
                "pass": true
            },
            "st21": {
                "pass": true
            },
            "st22": {
                "pass": true
            },
            "st23": {
                "pass": true
            },
            "st24": {
                "track": "2",
                "arr": "058",
                "dep": "100"
            },
            "st25": {
                "pass": true
            },
            "st26": {
                "pass": true
            },
            "st27": {
                "pass": true
            },
            "st28": {
                "pass": true
            },
            "st29": {
                "pass": true
            },
            "st30": {
                "pass": true
            },
            "st31": {
                "pass": true
            },
            "st32": {
                "pass": true
            },
            "st33": {
                "track": "3",
                "arr": "150",
                "dep": "151"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "pass": true
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "pass": true
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "pass": true
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "pass": true
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "pass": true
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "arr": "251",
                "dep": "252"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "3",
                "arr": "308",
                "dep": "312"
            }
        }
    },
    {
        "id": "t198",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "室川福田",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2233"
            },
            "st1": {
                "track": "2",
                "arr": "2237",
                "dep": "2237"
            }
        }
    },
    {
        "id": "t199",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "昼川温泉",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2240"
            },
            "st1": {
                "track": "2",
                "arr": "2244",
                "dep": "2244"
            },
            "st2": {
                "track": "12通",
                "arr": "2249",
                "dep": "2249"
            },
            "st3": {
                "track": "2",
                "arr": "2255",
                "dep": "2255"
            },
            "st4": {
                "track": "2",
                "arr": "2300",
                "dep": "2300"
            },
            "st5": {
                "track": "2",
                "arr": "2303",
                "dep": "2303"
            },
            "st6": {
                "track": "2",
                "arr": "2309",
                "dep": "2309"
            },
            "st7": {
                "track": "2",
                "arr": "2314",
                "dep": "2314"
            },
            "st8": {
                "track": "2",
                "arr": "2321",
                "dep": "2321"
            },
            "st9": {
                "track": "2",
                "arr": "2327"
            }
        }
    },
    {
        "id": "t200",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "横賀",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2310"
            },
            "st1": {
                "track": "2",
                "arr": "2314",
                "dep": "2314"
            },
            "st2": {
                "track": "12通",
                "arr": "2319",
                "dep": "2319"
            },
            "st3": {
                "track": "2",
                "arr": "2325",
                "dep": "2325"
            },
            "st4": {
                "track": "2",
                "arr": "2330",
                "dep": "2330"
            },
            "st5": {
                "track": "2",
                "arr": "2333",
                "dep": "2333"
            },
            "st6": {
                "track": "2",
                "arr": "2339",
                "dep": "2339"
            },
            "st7": {
                "track": "2",
                "arr": "2344"
            }
        }
    },
    {
        "id": "t201",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "大谷地",
        "startWork": "",
        "endStation": "江乃原",
        "endWork": "",
        "times": {
            "st12": {
                "track": "2",
                "dep": "2345"
            },
            "st13": {
                "track": "2",
                "arr": "2352",
                "dep": "2352"
            },
            "st14": {
                "track": "2",
                "arr": "2358",
                "dep": "2358"
            },
            "st15": {
                "track": "2",
                "arr": "003",
                "dep": "003"
            },
            "st16": {
                "track": "2",
                "arr": "008",
                "dep": "008"
            },
            "st17": {
                "track": "2",
                "arr": "011"
            }
        }
    },
    {
        "id": "t202",
        "trainNo": "71",
        "duty": "",
        "type": "急行",
        "name": "いかるべ",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "加磨",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2335"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "track": "12通",
                "arr": "2343",
                "dep": "2343"
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "2354",
                "dep": "2354"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "005",
                "dep": "005"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "track": "2",
                "arr": "017",
                "dep": "020"
            },
            "st10": {
                "track": "2",
                "arr": "031",
                "dep": "031"
            },
            "st11": {
                "pass": true
            },
            "st12": {
                "track": "2",
                "arr": "048",
                "dep": "050"
            },
            "st13": {
                "pass": true
            },
            "st14": {
                "track": "2",
                "arr": "101",
                "dep": "102"
            },
            "st15": {
                "pass": true
            },
            "st16": {
                "pass": true
            },
            "st17": {
                "track": "2",
                "arr": "112",
                "dep": "114"
            },
            "st18": {
                "pass": true
            },
            "st19": {
                "pass": true
            },
            "st20": {
                "pass": true
            },
            "st21": {
                "track": "1",
                "arr": "139",
                "dep": "140"
            },
            "st22": {
                "pass": true
            },
            "st23": {
                "pass": true
            },
            "st24": {
                "track": "2",
                "arr": "205",
                "dep": "220"
            }
        }
    },
    {
        "id": "t203",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "室川福田",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2315"
            },
            "st1": {
                "track": "2",
                "arr": "2319",
                "dep": "2319"
            }
        }
    },
    {
        "id": "t204",
        "trainNo": "",
        "duty": "",
        "type": "回送",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "室川福田",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "006"
            },
            "st1": {
                "track": "2",
                "arr": "010",
                "dep": "010"
            }
        }
    },
    {
        "id": "t205",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "楠手",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "2350"
            },
            "st1": {
                "track": "2",
                "arr": "2354",
                "dep": "2354"
            },
            "st2": {
                "track": "12通",
                "arr": "2359",
                "dep": "2359"
            },
            "st3": {
                "track": "2",
                "arr": "005",
                "dep": "005"
            },
            "st4": {
                "track": "2",
                "arr": "010"
            }
        }
    },
    {
        "id": "t206",
        "trainNo": "",
        "duty": "",
        "type": "普通",
        "name": "",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "室川福田",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "017"
            },
            "st1": {
                "track": "2",
                "arr": "021",
                "dep": "021"
            }
        }
    },
    {
        "id": "t207",
        "trainNo": "8073M",
        "duty": "",
        "type": "急行",
        "name": "いかるべ",
        "number": "83",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "夜寄",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "040"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "track": "12通",
                "arr": "046",
                "dep": "046"
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "2",
                "arr": "055",
                "dep": "055"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "2",
                "arr": "105",
                "dep": "105"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "pass": true
            },
            "st10": {
                "track": "2",
                "arr": "126",
                "dep": "126"
            },
            "st11": {
                "pass": true
            },
            "st12": {
                "pass": true
            },
            "st13": {
                "pass": true
            },
            "st14": {
                "track": "2",
                "arr": "150",
                "dep": "150"
            },
            "st15": {
                "pass": true
            },
            "st16": {
                "pass": true
            },
            "st17": {
                "track": "2",
                "arr": "159",
                "dep": "200"
            },
            "st18": {
                "pass": true
            },
            "st19": {
                "pass": true
            },
            "st20": {
                "pass": true
            },
            "st21": {
                "track": "1",
                "arr": "221",
                "dep": "230"
            },
            "st22": {
                "pass": true
            },
            "st23": {
                "pass": true
            },
            "st24": {
                "track": "2",
                "arr": "252",
                "dep": "300"
            },
            "st25": {
                "pass": true
            },
            "st26": {
                "pass": true
            },
            "st27": {
                "pass": true
            },
            "st28": {
                "pass": true
            },
            "st29": {
                "pass": true
            },
            "st30": {
                "track": "2",
                "arr": "331",
                "dep": "340"
            },
            "st31": {
                "pass": true
            },
            "st32": {
                "pass": true
            },
            "st33": {
                "track": "2",
                "arr": "350",
                "dep": "400"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "track": "2",
                "arr": "408",
                "dep": "410"
            }
        }
    },
    {
        "id": "t208",
        "trainNo": "9073N",
        "duty": "",
        "type": "普通",
        "name": "いかるべリレー",
        "startStation": "夜寄",
        "startWork": "",
        "endStation": "恵地",
        "endWork": "",
        "times": {
            "st36": {
                "track": "2",
                "dep": "420"
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "track": "2",
                "arr": "435",
                "dep": "435"
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "442",
                "dep": "443"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "pass": true
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "track": "2",
                "arr": "457"
            }
        }
    },
    {
        "id": "t209",
        "trainNo": "541M",
        "duty": "",
        "type": "寝台急行",
        "name": "みさき",
        "startStation": "囲森",
        "startWork": "",
        "endStation": "砂原",
        "endWork": "",
        "times": {
            "st0": {
                "track": "2",
                "dep": "110"
            },
            "st1": {
                "pass": true
            },
            "st2": {
                "pass": true
            },
            "st3": {
                "pass": true
            },
            "st4": {
                "track": "3",
                "arr": "123",
                "dep": "130"
            },
            "st5": {
                "pass": true
            },
            "st6": {
                "pass": true
            },
            "st7": {
                "track": "3",
                "arr": "141",
                "dep": "150"
            },
            "st8": {
                "pass": true
            },
            "st9": {
                "pass": true
            },
            "st10": {
                "pass": true
            },
            "st11": {
                "pass": true
            },
            "st12": {
                "pass": true
            },
            "st13": {
                "pass": true
            },
            "st14": {
                "pass": true
            },
            "st15": {
                "pass": true
            },
            "st16": {
                "pass": true
            },
            "st17": {
                "track": "23通",
                "arr": "249",
                "dep": "300"
            },
            "st18": {
                "pass": true
            },
            "st19": {
                "pass": true
            },
            "st20": {
                "pass": true
            },
            "st21": {
                "track": "2",
                "arr": "321",
                "dep": "330"
            },
            "st22": {
                "pass": true
            },
            "st23": {
                "pass": true
            },
            "st24": {
                "track": "3",
                "arr": "352",
                "dep": "400"
            },
            "st25": {
                "pass": true
            },
            "st26": {
                "pass": true
            },
            "st27": {
                "pass": true
            },
            "st28": {
                "pass": true
            },
            "st29": {
                "pass": true
            },
            "st30": {
                "track": "2",
                "arr": "431",
                "dep": "440"
            },
            "st31": {
                "pass": true
            },
            "st32": {
                "pass": true
            },
            "st33": {
                "track": "2",
                "arr": "450",
                "dep": "455"
            },
            "st34": {
                "pass": true
            },
            "st35": {
                "pass": true
            },
            "st36": {
                "pass": true
            },
            "st37": {
                "pass": true
            },
            "st38": {
                "pass": true
            },
            "st39": {
                "pass": true
            },
            "st40": {
                "pass": true
            },
            "st41": {
                "track": "2",
                "arr": "525",
                "dep": "526"
            },
            "st42": {
                "pass": true
            },
            "st43": {
                "pass": true
            },
            "st44": {
                "pass": true
            },
            "st45": {
                "pass": true
            },
            "st46": {
                "pass": true
            },
            "st47": {
                "pass": true
            },
            "st48": {
                "pass": true
            },
            "st49": {
                "track": "2",
                "arr": "553",
                "dep": "554"
            },
            "st50": {
                "pass": true
            },
            "st51": {
                "pass": true
            },
            "st52": {
                "pass": true
            },
            "st53": {
                "track": "2",
                "arr": "605",
                "dep": "614"
            }
        }
    }
];