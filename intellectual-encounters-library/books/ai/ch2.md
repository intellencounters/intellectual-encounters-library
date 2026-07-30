# 2. What It Cannot Do (Yet, or Ever)

There is a particular kind of tiredness that comes from being told, on a loop, that the thing you are studying will shortly do everything or destroy everything. The demos are real. The failures are also real, and they are less photogenic, so they travel less. If Chapter 1 was about what these systems *are*, this chapter is about where they break — not to belittle them, but because knowing the edges of a tool is what separates someone who can build with it from someone who can only be impressed by it.

Two temptations sit on either side of this subject, and both are lazy. One is the hype: the sense that because a system produced a fluent paragraph or a plausible forecast, it must be on a smooth path to doing anything a human can. The other is the reflexive dismissal: "it's just autocomplete," as if fluency at scale were nothing. Neither survives contact with the details. The honest position lives in the details, so let us go there.

## 2.1 Correlation is not causation

A model learns which features go with which labels — which things *co-occur*. It does not, on its own, learn which things *cause* which. This sounds like a technicality. It is the source of an enormous fraction of real-world failures.

The classic shape is :::glossary term="Confounding":::[^pearl]: two things move together because a third, unseen thing drives both. A model trained on hospital records once learned that asthma patients admitted with pneumonia had *lower* risk of dying — and so, taken literally, it would have recommended sending them home. The pattern was real in the data. The reason was that asthma patients with pneumonia were rushed straight to intensive care, and *that care* lowered their risk. The model saw the correlation and had no way to see the cause. A system that optimises on correlations will confidently recommend the exact wrong action whenever an intervention breaks the hidden link.

:::definition term="Confounding"
Confounding occurs when two variables appear related only because some third factor influences both. A model that has learned a confounded correlation will predict well as long as the world keeps running the way it did in the training data — but will give dangerous advice the moment someone *acts on* its output, because acting can sever the hidden connection the correlation depended on. Distinguishing correlation from causation generally requires more than data: it requires experiments, or careful causal assumptions, which most models are never given.
:::

:::check reread="2.1"
question: A model notices that customers who receive a retention discount are *more* likely to cancel, and concludes discounts cause cancellations. What is the most likely flaw?
- The model is correct; discounts obviously annoy customers into leaving.
- Confounding — discounts are sent to customers already showing signs of leaving, so a hidden factor drives both the discount and the cancellation.
- The model has overfit the training data and needs a larger sample.
- Correlation and causation are the same thing, so no flaw exists.
answer: 2
explanation: The discount and the cancellation both follow from something the model may not have isolated: the customer was already at risk, which is *why* they were targeted for a discount. This is textbook confounding. Reading the correlation as causation would lead you to cancel the retention programme precisely when it is needed. Establishing cause generally needs an experiment or explicit causal reasoning, not just more data.
:::

## 2.2 The world moves: distribution shift

Recall from Chapter 1 that a trained model is a photograph of the world as its data found it. The trouble is that the world does not hold still for the photograph. :::glossary term="Distribution shift"::: is the name for what happens when the data a model meets in deployment stops resembling the data it was trained on — and it is one of the most reliable ways for a good model to quietly go bad.

The shift can be abrupt or gradual. A fraud-detection model trained before a new scam existed cannot recognise the new scam. A demand forecaster tuned on pre-pandemic shopping was blindsided when behaviour changed overnight. A speech recogniser trained mostly on certain accents degrades on yours. A hiring model trained on last decade's promotions encodes last decade's world. In every case the model is not "wrong" in the way a buggy program is wrong; it is faithfully applying a pattern that no longer holds. And crucially, it does not know that it has gone stale. It returns its answers with the same steadiness as ever. The confidence is not a signal of correctness — it is a property of the arithmetic, computed the same way whether the input resembles the training data or not.

For a builder this has a blunt consequence: a model is not a thing you ship once. It is a thing you monitor, because the ground under it keeps moving. The most important question about any deployed system is not "how accurate was it in testing" but "how will we notice when it stops being accurate."

## 2.3 Bias in, bias out

Because a supervised model learns to reproduce the patterns in its examples, it will reproduce the *unwanted* patterns just as faithfully as the wanted ones. This is :::glossary term="Algorithmic bias":::[^oneil], and the phrase "bias in, bias out" is exact rather than rhetorical. If the historical data reflects who was hired, promoted, lent to, or policed — and those decisions carried human and structural prejudice — then a model trained to predict those outcomes learns to continue them, now wrapped in the authority of a number.

The uncomfortable part is that bias does not require anyone to be malicious, and removing the obvious variable does not remove the problem. Delete "gender" from a hiring model and it may reconstruct gender from other features — the sports played, the gap in a CV, the name of a school. The bias hides in the correlations. Worse, an automated system applies the bias at scale, uniformly, and with a veneer of objectivity that makes it harder to challenge than a single prejudiced manager. A human decision can be appealed to another human. "The algorithm decided" too often ends the conversation instead of starting it.

This lands differently depending on where you stand. For readers who have felt a system misread their name, their accent, or their face, the abstraction is not abstract. And the fix is not simply "more data," because more data drawn from the same unequal world deepens the pattern rather than correcting it. Fairness is a choice that has to be made deliberately and defended openly — and, as we will see, different definitions of fairness can genuinely conflict.

:::uncertainty title="Specific audit results and disparity figures"
There are well-known studies reporting error-rate gaps across skin tone, gender, and dialect in commercial systems, and specific percentage disparities are often quoted. Those figures are real research findings, but they are tied to particular systems, versions, and dates, and are easy to misstate or apply to the wrong system. This book does not reproduce specific numbers here. Citation needed — verify before publishing. If you cite an audit, cite the primary paper, name the exact system and version it tested, and give the date.
:::

:::check reread="2.3"
question: A lending model is retrained with far more historical data to reduce bias, but the disparity gets worse. Why is this outcome unsurprising?
- More data always increases bias; smaller datasets are fairer.
- If the historical data itself encodes unequal past decisions, adding more of the same data reinforces the pattern rather than correcting it.
- The model must have been trained incorrectly; more data can only ever reduce bias.
- Bias only comes from the choice of algorithm, never from the data.
answer: 2
explanation: "Bias in, bias out" means a model faithfully reproduces the patterns in its examples, including unjust ones. When the data reflects unequal historical decisions, more of it strengthens the very pattern you wanted to remove. Reducing bias is a deliberate design and governance choice — auditing outcomes, defining fairness explicitly, sometimes correcting the data — not something extra volume delivers on its own.
:::

## 2.4 Brittleness: competent and fragile at once

A striking feature of these systems is that competence and fragility live side by side. A model can perform at a high level across thousands of ordinary cases and then fail bizarrely on an input a human would handle without thinking. This is :::glossary term="Brittleness":::: strong average performance masking sharp, unpredictable failure at the edges.

Small, meaningless changes to an input can flip an output. A little noise added to an image — imperceptible to you — can make a vision system confidently misclassify it. A slightly reworded prompt can turn a correct answer into a confident fabrication. The failures are not gentle degradations at the boundary of competence; they can be sudden and total, and they do not come with a warning light. A human who is unsure usually shows it. Many models do not have a reliable "I don't know" — they produce their best guess with the same fluency whether the ground is solid or absent. In a large language model this appears as the confident invention of facts, citations, or names that do not exist.

This is why "it passed the demo" and "it works in the wild" are different claims. The demo samples the easy middle of the distribution. Deployment samples everything, including the strange, adversarial, and unprecedented — exactly where brittleness lives.

## 2.5 Competence is not comprehension — and the hype cuts both ways

Underneath correlation-blindness, distribution shift, bias, and brittleness sits the single distinction from Chapter 1: these systems can be *competent* without *comprehending*. They can produce right answers without a grip on why the answers are right, which is precisely why their failures are so hard to anticipate. A person who understands a subject fails gracefully, at the edges, in ways that make sense. A system matching patterns can fail catastrophically in the middle, in ways that make no sense, because there was never any understanding to protect it.

The oldest version of this worry is John Searle's *Chinese Room*[^searle]: a person who follows a rulebook to produce correct Chinese replies, without understanding a word, may look from outside exactly like someone who understands. Symbol-manipulation, Searle argued, is not the same as meaning. The argument is contested — it has been for decades — but it names the exact question a builder must keep live.

:::argument title="The case for treating today's systems as unreliable narrators"
conclusion: High-stakes decisions should not be handed to a current machine-learning system without a human who can understand, question, and override it.
premise: These systems learn correlations, not causes, so their recommendations can be confidently wrong whenever action breaks a hidden link.
premise: They degrade silently under distribution shift and report no loss of confidence when they go stale.
premise: They are brittle, failing sharply and without warning on inputs outside their comfortable middle.
premise: They can be competent without comprehending, so their errors are not the graceful, edge-of-knowledge errors a knowledgeable human makes.
:::

:::counter title="Objection: the same standard would ground every useful tool" to="The case for treating today's systems as unreliable narrators"
The strongest reply from the optimist's side is that humans share every one of these flaws — we confuse correlation with causation constantly, our judgement goes stale, we are biased and overconfident, and we invent memories — yet we let humans make high-stakes decisions all the time. The right comparison is never "machine versus perfection" but "machine-plus-human versus human-alone," and on many concrete tasks a well-monitored system already reduces error, cost, and delay relative to the tired, distracted person it assists. Demanding that a system comprehend before it may help sets a bar we do not set for a junior colleague, a checklist, or a pocket calculator. What matters is not whether the system understands, but whether the whole arrangement — system, oversight, and the ability to appeal — produces better and fairer outcomes than the alternative actually on offer. The skeptic is right about the failure modes and can still be wrong about the conclusion.

Both are worth holding at once: the failure modes in this chapter are real and under-advertised, *and* the correct response is usually careful, monitored deployment with human recourse, not refusal.
:::

:::reflect
Pick a task in your own field that people are excited to automate. Steel-man the optimist: what would genuinely improve if a capable system did it? Now steel-man the skeptic: name the specific way it would fail — is it confounding, distribution shift, bias, or brittleness? Commit to a position on whether you would deploy it today, and write down the one piece of evidence that would change your mind.
:::

The point of cataloguing what these systems cannot do is not despair and not triumph. It is calibration. A tool whose limits you understand is one you can place carefully — inside the loop where a human still holds the judgement it lacks. That placement, and who is answerable when it goes wrong, is where the human questions begin.

[^pearl]: The modern framework for separating correlation from causation is set out for a general audience in Judea Pearl and Dana Mackenzie, *The Book of Why: The New Science of Cause and Effect* (Basic Books, 2018), and more technically in Judea Pearl, *Causality* (Cambridge University Press, 2nd ed., 2009).
[^oneil]: On how automated systems encode and scale existing inequities, see Cathy O'Neil, *Weapons of Math Destruction* (Crown, 2016); Safiya Umoja Noble, *Algorithms of Oppression* (NYU Press, 2018); and Ruha Benjamin, *Race After Technology* (Polity, 2019).
[^searle]: John Searle, "Minds, Brains, and Programs," *Behavioral and Brain Sciences* 3 (1980), the source of the Chinese Room thought experiment. For the founding statement of the opposing, behaviour-first tradition, see Alan Turing, "Computing Machinery and Intelligence," *Mind* 59 (1950).
