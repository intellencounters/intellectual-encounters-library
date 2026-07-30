# 5. The Prediction Machines That Talk: Understanding Generative AI

Somewhere in your phone right now is a system that will draft the difficult email to the Ausländerbehörde, explain a database concept at two in the morning more patiently than any tutor, and invent, with perfect confidence, a German regulation that does not exist. All three behaviours come from the same machinery. This chapter is about that machinery — the :::glossary term="Large language model"::: — and it has one organising claim: everything these systems do, astonishing and absurd alike, follows from what they are — the fitted function of Chapter 1, pointed at a strange and wonderful target. Hold on to that, and the magic becomes comprehensible and the failures predictable, which is exactly the combination a builder needs.

## 5.1 The whole trick: predict the next word

Here is the training objective, stated fully: given the words so far, predict the next one. That is it. Take a mountain of text, hide the next word, ask the model to guess, measure the error, nudge the settings — Chapter 1's loop, run at colossal scale. The label needs no annotator, because the text itself supplies it: every sentence ever written is a stack of examples of what word followed what, so the labels come free.[^shannon]

:::definition term="Next-token prediction"
The training objective of a large language model: given a sequence of text so far, output a probability for every possible next token (a word or word-fragment) in its vocabulary. Generation is this step in a loop — sample a likely next token, append it, predict again. Everything a language model produces, from poetry to working code to confident falsehood, is assembled one predicted token at a time; there is no separate module that plans, checks facts, or knows when it does not know.
:::

The reflex at this point is dismissal: "so it's autocomplete." Resist the reflex long enough to see what the objective actually demands. To predict the next word *well* across all human text, you cannot rely on word statistics alone. What follows "The verdict, delivered after the longest trial in the state's history, was..." depends on grammar, on what verdicts are, on the fact that trials end in outcomes. Prediction, pushed hard enough, drags in a compressed model of the patterns of the world *as text describes it* — because that is what the words depend on. How much genuine structure gets dragged in, versus how much surface fluency, is the live question of Section 5.7. But "just autocomplete" and "obviously understands" are both cheap answers to an expensive question.

:::check reread="5.1"
question: Where do the "labels" for training a language model come from?
- Teams of annotators write the correct next word for millions of sentences.
- The text itself: each next word in existing text serves as the correct answer for the sequence before it, so ordinary writing supplies training examples without manual labelling.
- The model generates its own labels from imagination.
- Language models are not trained; they look up answers on the internet at the moment you ask.
answer: 2
explanation: Next-token prediction is sometimes called self-supervised for exactly this reason — the supervision is embedded in the data: hide the next word, and the sentence itself says whether the guess was right. The labelling bottleneck of Chapter 4 fell away for language because the training signal came free with every page ever written.
:::

## 5.2 Why scale changed everything

For years this idea produced systems that were interesting and useless — they lost the thread within a sentence. What changed was scale, in three coupled dimensions: more text, larger models (more of Chapter 1's adjustable settings), and more computation to fit one to the other. The empirical surprise of the past decade — a surprise to many researchers too — is how far capability kept climbing as all three grew, and how abilities appeared that nobody explicitly trained for. A system trained only to continue text turned out, past a certain scale, to translate, summarise, follow instructions, and write passable code. Nobody wrote a translation module. Continuing text well enough *subsumed* translation.

Why scale produced these jumps is not settled science. Some researchers argue capabilities emerge suddenly at thresholds; others that the suddenness is an artefact of how we measure, and the improvement underneath is smooth. The practical point survives either way: capability tracked scale as decades of clever hand-engineering had not, which is why the field reorganised itself around it.

:::uncertainty title="Names, sizes, and benchmark scores — deliberately omitted"
Any honest account here is tempted to say which model has how many parameters, which abilities "emerged" at which scale, and which system currently tops which benchmark. Every such specific is tied to a date and goes stale within months, the emergence claims are contested in the research literature, and secondhand figures are frequently garbled; citation needed — verify before publishing. This book describes the shape of the scaling story and no more. For current specifics, go to primary sources — model reports and papers — check their dates, and expect them to be superseded.
:::

## 5.3 Meaning as geometry

How does arithmetic handle *words*? The answer is one of the field's loveliest ideas. Each token is represented as an :::glossary term="Embedding"::: — a long list of numbers, which you can picture as a point in a space of many dimensions. The numbers are not designed; they are learned in training, adjusted by the same error-nudging loop as everything else. And because words that appear in similar contexts must lead to similar predictions, the training pressure pushes them close together in the space. *Doctor* ends up near *nurse* and *hospital*, far from *carburettor*. Directions in the space pick up meaning too: the displacement from *Berlin* to *Germany* resembles the displacement from *Delhi* to *India*. Relationships become geometry.

This is worth a slow breath: meaning-*like* structure, extracted from nothing but co-occurrence, represented as position. It is also worth immediate deflation: the geometry encodes how words are *used*, and inherits everything Chapter 2 said about data. If the training text associates some names with menace or some dialects with ignorance, that association is now a *direction in space*, quietly available to every downstream prediction — the mechanism by which Chapter 2's bias becomes load-bearing infrastructure.

## 5.4 What attention roughly does

One more piece of machinery deserves a plain-language sketch, because its name has escaped into headlines. The architecture behind modern language models — the *transformer* — is built around an operation called :::glossary term="Attention":::.[^vaswani]

The problem it solves: meaning is contextual. In "the bank approved the loan," *bank* means one thing; move it next to *river* and it means another. Attention lets every token, as it is processed, look back across the other tokens and ask, in effect, *which of you matter for what I mean here?* — weighting each by learned relevance and blending in their information. *Bank* attends to *loan* and shades itself financial. The weights are not programmed; they are learned, in the same loop, because attending to the right words makes the next-word prediction better. Stack this many layers deep and the model can build representations of increasingly long-range structure — which is why modern systems hold a thread across pages where their predecessors lost it inside a sentence. The working intuition, no equations required: attention is learned, layered relevance-weighting, and it is what made scale usable.

:::check reread="5.4"
question: In "the bank approved the loan," what does attention contribute to the model's handling of the word "bank"?
- It looks up "bank" in a built-in dictionary and selects the financial definition.
- It lets the representation of "bank" be shaped by learned relevance-weights over the other words in the passage — here, "approved" and "loan" — so context shades the word toward its financial sense.
- It deletes ambiguous words from the input before prediction.
- It asks the user which meaning was intended.
answer: 2
explanation: There is no dictionary and no disambiguation module. Attention is a learned weighting: each token's representation draws on the tokens training has made relevant to it, so "bank" beside "loan" is processed differently from "bank" beside "river". The weights exist because they improved next-token prediction; stacked in many layers, they let the model track structure across long stretches of text.
:::

## 5.5 Hallucination is what generation is; being right is the special case

Now the failure everyone has met. Ask a language model for sources on a niche topic and it may produce a beautifully formatted citation to a paper that has never existed. The field calls this :::glossary term="Hallucination":::, and the common framing — a bug awaiting a patch — gets it exactly backwards.

Recall what the machine does: it produces plausible continuations. When the training data contains the answer strongly and often, the most plausible continuation is also true, and we call the output knowledge. When the data is thin, conflicted, or absent, the machinery does *exactly the same thing* — assembles the most plausible-looking continuation — and we call the output hallucination. It is one behaviour, not two. The model is not lying, because it is not asserting; it is continuing. A fabricated citation is what a citation *shaped like the truth* looks like when the truth is not there to be retrieved. This is Chapter 2's missing "I don't know," now wearing perfect grammar — and fluency makes it more dangerous, not less, because every signal you unconsciously use to gauge a human's confidence has been forged. Mitigations exist and matter, but a builder should treat truthfulness as a property to be *engineered around the model*, never assumed of it. Chapter 4's habit transfers exactly: fluent output, like a too-good number, is not evidence.

## 5.6 Prompting, retrieval, and what they really are

Two practical techniques follow directly from the mechanics, and are worth understanding conceptually rather than as folklore. A :::glossary term="Prompt"::: is the text whose continuation you are requesting — and *prompting* works because different openings make different continuations plausible. "Explain to a first-year student, step by step" steers the machinery toward the region of text-space where patient explanations live; two worked examples make a third of the same shape overwhelmingly likely. Nothing mystical is happening: you are choosing the context the prediction runs in — real leverage, but leverage over context, not a way of installing care or truthfulness that is not there.

:::glossary term="Retrieval-augmented generation"::: attacks hallucination at its root cause. If plausible-but-false appears where the model's training left gaps, then *put the truth in the prompt*: have ordinary search first fetch the relevant documents — the company's actual policies, the actual regulation — and ask the model to answer from them. The model becomes less an oracle and more a fluent reader of documents you chose: the answer can *cite* something checkable, and changes when the documents change rather than when the model is retrained. Not a cure — the model can still misread or overrun what it was given — but it converts "trust the model's memory" into "trust these documents plus a summariser," a far better bet, and the pattern behind most serious enterprise use.

## 5.7 Understanding or mimicry? Both answers, at strength

Chapters 1 and 2 left a question deliberately open: whether competence at prediction can amount to comprehension. Language models sharpen it to its finest point — Searle's Chinese Room[^searle-turing] fought on new ground — so here are the strongest forms of both answers.

:::argument title="The form-alone argument: mimicry without meaning"
conclusion: A system trained only on text cannot understand language in the sense that matters, however fluent its outputs.
premise: Understanding a word involves connection to what it is about — to things, actions, and consequences in the world — and not merely to other words.
premise: A language model's training signal is form alone: which tokens follow which. No use of "burn" in its data ever connected to heat, damage, or pain — only to other tokens.
premise: Perfect mastery of statistical relations among symbols is compatible, in principle, with the absence of any grasp of what the symbols are about — this is the enduring point of Searle's Chinese Room.
premise: The characteristic failures we observe — fluent fabrication, confident nonsense at the edges — are exactly what mastered form without grounded meaning predicts.
:::

:::counter title="Objection: the capability reply, taken seriously" to="The form-alone argument: mimicry without meaning"
The strongest reply starts where Turing started: if no behavioural test can distinguish understanding from its perfect functional equivalent, the distinction is doing no work — and "grounding" may name a preference for our kind of wiring rather than a requirement of meaning. Three further points give the reply teeth. First, text is not empty form: it is a dense record of humans describing the world, and predicting it deeply may require recovering much of the structure being described — interpretability researchers report internal features that track states of affairs, not just word statistics, though how far such findings generalise is contested. Second, the systems handle genuinely novel combinations — explaining a new error message, recasting an argument in an unfamiliar analogy — where a lookup of remembered form should fail; regularity captured that deep begins to look like what we *mean* by understanding, unless the sceptic can say what extra ingredient is missing and how to test for it. Third, your own grasp of "photosynthesis" or "inflation" is largely word-mediated too, learned from text and testimony rather than direct acquaintance. The sceptic's rejoinder — that hallucination betrays a missing connection between competence and truth that no fluency repairs — keeps the debate alive. Hold it as live: these systems have forced philosophy's oldest question about meaning into experimental range, and neither camp has closed it.[^octopus]
:::

:::reflect
Steel-man the side you currently reject. If you lean "it's mimicry," write the strongest concrete capability that would shake you — something a mere form-matcher should not manage — and what you will conclude if a system does it reliably. If you lean "it understands," write the failure that should shake you — something no genuine understander would do — and what you will conclude when you next see one. Keep the note. In this debate most positions harden by repetition rather than evidence; yours does not have to.
:::

The machinery, then: a next-token predictor, made powerful by scale, representing meaning as learned geometry, weighting context by learned relevance, generating plausibility that is usually — not reliably — truth. Astonishing and bounded at once, and both facts load-bearing. The final chapter asks what it all means for the careers you are building while you read.

[^shannon]: The idea of treating language as a predictable statistical sequence goes back to Claude Shannon's founding work on information theory, "A Mathematical Theory of Communication," *Bell System Technical Journal* (1948), which already discussed predicting English text. Cited as intellectual lineage, not as a description of modern systems.
[^vaswani]: The transformer architecture and its attention mechanism were introduced in Ashish Vaswani and colleagues, "Attention Is All You Need," in *Advances in Neural Information Processing Systems* (NeurIPS, 2017). Cited for the architecture's origin; this chapter's description is a plain-language gloss, and the paper is the primary source.
[^searle-turing]: John Searle, "Minds, Brains, and Programs," *Behavioral and Brain Sciences* 3 (1980), and Alan Turing, "Computing Machinery and Intelligence," *Mind* 59 (1950) — the two poles of this debate, introduced in Chapter 2 and applied here to systems trained on text alone.
[^octopus]: A well-known modern statement of the form-versus-meaning argument is Emily M. Bender and Alexander Koller, "Climbing towards NLU: On Meaning, Form, and Understanding in the Age of Data," *Proceedings of ACL* (2020), source of the widely discussed "octopus" thought experiment. Cited for the argument's structure; the replies summarised above appear across a large and ongoing literature rather than any single canonical paper.
