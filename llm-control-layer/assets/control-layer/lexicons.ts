// Ready-made cue-word lexicons. Detection patterns are configuration, not core
// logic: swap or extend these per language and domain. These lists are starting
// points — tune them against your own failure transcripts.

import type { Lexicon } from "./validators";

export const englishLexicon: Lexicon = {
  actionCues: ["said", "claimed", "told", "argued", "pointed out", "mentioned", "reacted", "voted", "reported", "admitted"],
  stanceCues: ["i think", "i believe", "i suspect", "i trust", "vote for", "my pick", "i'd choose", "i propose", "i'll commit", "the answer is", "i recommend"],
  fillerCues: ["wait and see", "let me see", "hard to say", "we'll find out", "let's hear", "for now i'll hold", "no strong opinion", "time will tell"],
  substanceCues: ["i propose", "proposal", "criterion", "criteria", "let's decide", "my question", "i'll ask", "i suggest", "let's set", "i'd start by", "we should decide", "here's the rule"]
};

export const japaneseLexicon: Lexicon = {
  actionCues: ["と言った", "と言っている", "が言う通り", "の指摘", "と主張", "が反応", "に投票", "と報告", "が認めた", "の発言"],
  stanceCues: ["と思います", "だと思う", "疑い", "信頼", "に投票", "を推し", "提案します", "結論は", "おすすめ", "に決め", "を選びます"],
  fillerCues: ["様子見", "保留", "なんとも言えない", "もう少し様子", "話を聞いてから", "今は動かない", "出方を見", "時間が解決"],
  substanceCues: ["提案", "基準", "条件", "決めましょう", "質問", "聞きたい", "方針", "先に決め", "整理し", "やるべき", "やりましょう"]
};
