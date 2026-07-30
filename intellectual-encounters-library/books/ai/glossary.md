# Glossary

## Model

A function — a rule for turning inputs into outputs — whose internal settings (its *parameters*) have been adjusted to fit a collection of examples. In machine learning, "model" does not mean a theory of how the world works; it means a fitted input-output mapping. A model can predict extremely well while embodying no understanding of *why* its inputs and outputs go together.

## Feature

A piece of the input a model is allowed to look at when making a prediction: the words in an email, the day of the week, a customer's past orders. Choosing which features a model can see — and which it cannot — is one of the most consequential design decisions in a system, because a model can only find patterns in what it is shown.

## Label

The target answer a supervised model is trained to produce for a given input: *spam* or *not spam*, the actual sales figure, the correct diagnosis. In supervised learning, examples pair features with correct labels, and the model is adjusted until its outputs match the labels well.

## Supervised learning

The most common form of machine learning, in which a model is trained on examples that pair inputs (features) with correct answers (labels), and learns to reproduce the mapping from one to the other. Contrasts with settings where labels are absent. Its power and its danger are the same: it faithfully learns whatever pattern the labelled examples contain, wanted or not.

## Training

The process of fitting a model to data — repeatedly showing it examples, measuring how wrong its outputs are, and adjusting its settings to reduce that error. Training is comparatively slow and expensive, and it is where the choice of examples exerts its enormous influence. Once training ends, the model's settings are typically frozen.

## Inference

Using a finished, trained model on new input to produce an output — the email arrives, the model returns *spam*. Inference is comparatively cheap and fast, and, importantly, the model does not usually keep learning from the inputs it sees at this stage unless a separate pipeline feeds them back into future training.

## Generalization

The property of performing well on new, unseen inputs drawn from the same broad situation as the training data, rather than merely reproducing the training examples. Generalization is the actual goal of machine learning; performance measured on held-out data the model never trained on is the honest test of whether it has been achieved.

## Overfitting

A failure in which a model fits its training examples so closely that it captures their incidental noise — the coincidences of that particular sample — instead of the general pattern. The symptom is a widening gap between excellent training performance and disappointing performance on new data. The usual defences are more varied data, deliberately simpler models, and always measuring on unseen examples.

## Confounding

A situation in which two variables appear related only because a third, often unseen, factor influences both. A model that has learned a confounded correlation predicts well while the world runs as before, but can give dangerous advice the moment someone *acts* on its output, because acting may sever the hidden link the correlation depended on. Distinguishing cause from correlation generally requires experiments or explicit causal assumptions, not more data.

## Distribution shift

What happens when the data a model meets in deployment stops resembling the data it was trained on — because the world changed, the population differs, or a new situation arose. Under distribution shift a model can degrade badly while reporting no loss of confidence, because its confidence is a property of its arithmetic, computed the same way whether or not the input resembles the training data.

## Algorithmic bias

Systematic, unfair skew in a model's outputs that reflects unequal patterns in its training data or design. Because a supervised model reproduces the patterns in its examples, it reproduces unjust historical patterns just as faithfully as useful ones — and removing an obvious sensitive variable often does not help, because the model reconstructs it from correlated features. Reducing bias is a deliberate design and governance choice, not a by-product of more data.

## Brittleness

The tendency of a system to combine strong average performance with sharp, unpredictable failure on inputs outside its comfortable middle — including small, meaningless changes to an input that flip its output. Brittle systems often lack a reliable "I don't know," producing confident answers whether the ground is solid or absent, which makes their failures hard to anticipate.

## Large language model

A model trained on very large amounts of text to predict likely continuations of a sequence of words, and thereby able to generate fluent language, answer questions, and draft text. Its fluency can mask the limits described in this book: it manipulates statistical patterns over language and can produce confident, well-formed statements that are false, including invented facts, citations, and names.

## Automation

The use of machines or software to perform tasks previously done by people. Automation historically comes for *tasks* rather than whole *jobs*, and for routine, codifiable work first, tending to re-compose jobs around the non-routine judgement, care, and oversight that resist codification — rather than simply erasing them.

## Test set

A portion of the available examples locked away during development and used only once, at the end, to measure how the finished model performs on data it has never influenced. Distinct from the training set (which the model learns from) and the validation set (used while tuning choices). Every peek at a dataset followed by an adjustment slowly fits the model to it, so the untouched test set is the only number that deserves to be called honest.

## Data leakage

The contamination of training or evaluation with information that would not actually be available at prediction time — a feature recorded after the outcome, a statistic computed over the whole dataset before splitting, a copy of the answer hiding in an innocent-looking column. Leakage inflates measured performance, and the inflation vanishes on deployment. Because it makes results *better*, nobody instinctively hunts for it; the professional reflex on seeing a too-good number is to ask what leaked.

## Baseline

The simplest possible predictor for a problem — always guess the most common outcome, predict that tomorrow equals today, apply the one rule the domain expert already uses. Built first, before any model, a baseline reveals whether the problem is genuinely hard and whether a complex model's improvement is worth its cost. A model that cannot clearly beat the baseline has not yet earned its complexity.

## Precision

Of the items a model flagged, the fraction that truly were what it claimed. High precision means few false alarms. Precision trades off against recall: flagging only the certainties makes precision excellent while letting many real cases slip through. Where to sit on the trade-off is a question about which mistake hurts more — a judgement that belongs to the people who bear the mistakes, not to the arithmetic.

## Recall

Of the items that were truly there to be found, the fraction the model actually caught. High recall means little escapes. Recall trades off against precision: flagging everything makes recall perfect while burying users in false alarms. A screening task usually wants recall (miss nothing, tolerate false alarms that a follow-up will clear); a task that triggers automatic punitive action had better want precision.

## Next-token prediction

The training objective of a large language model: given the text so far, output a probability for every possible next token (a word or word-fragment), with generation being this step run in a loop. The labels come free — every existing sentence supplies its own next word — which is what allowed training on vast text collections. Everything such a model produces, from working code to confident falsehood, is assembled one predicted token at a time.

## Embedding

The representation of a token (or document, or image) as a long list of numbers — a point in a high-dimensional space — learned during training rather than designed. Because words used in similar contexts must lead to similar predictions, they end up close together, and relationships become directions in the space: meaning-like structure extracted from co-occurrence alone. The geometry encodes how words are *used* in the training data, and therefore inherits the data's associations, including the biased ones.

## Attention

The core operation of the transformer architecture: as each token is processed, it draws on the other tokens in the input, weighted by learned relevance — so "bank" beside "loan" is represented differently from "bank" beside "river". The weights are not programmed; they exist because attending to the right context improved next-token prediction during training. Stacked in many layers, attention lets a model track long-range structure across a text, which is what made scale usable.

## Hallucination

A language model's production of fluent, confident content that is false — invented facts, citations, names, or regulations. Structurally, it is not a separate malfunction: the model always generates the most plausible continuation, and when the truth is well represented in its training data the plausible and the true coincide, while when the data is thin or absent the same machinery produces plausibility alone. Mitigations (such as retrieval) exist, but truthfulness must be engineered around the model, never assumed of it.

## Prompt

The text supplied to a language model, whose continuation the model produces. Prompting works because different openings make different continuations plausible — instructions, examples, and context steer the prediction toward different regions of learned text-space. Real leverage, but leverage over context only: a prompt cannot install care or truthfulness that the machinery does not have.

## Retrieval-augmented generation

A pattern in which ordinary search first fetches relevant, trusted documents and the language model is asked to answer *from them*, placed in its prompt, rather than from its trained-in associations. This converts "trust the model's memory" into "trust these documents plus a fluent reader" — answers can cite something checkable and can change when the documents change. It reduces hallucination without curing it, since the model can still misread or overrun what it was given.

## Precision agriculture

The application of sensing, data, and automated decision-making at the level of the individual plot, plant, or animal rather than the whole field — targeted spraying, per-zone irrigation, individual livestock monitoring. A domain where every limit in this book appears in physical form: shifted distributions between valleys and seasons, labels from scarce expert time, precision–recall trade-offs with yield attached, and accountability questions between grower and machine.
