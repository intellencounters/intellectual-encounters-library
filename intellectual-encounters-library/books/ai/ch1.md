# 1. What "Learning From Data" Means

It is two in the morning. The warehouse scanner in your hand keeps suggesting the next bin to walk to, and it is usually right. On the train home you open your phone and a video you did not search for is waiting, and you watch it. During the afternoon before your shift you were revising for a database exam, and the autocomplete in your code editor finished a line before you did. None of these systems knows you. None of them understands warehouses, or trains, or SQL. Yet each behaves as if it had learned something about the world — and, in a precise and limited sense, each has.

This chapter is about that precise and limited sense. The word *learning* carries an enormous amount of quiet freight. When a child learns that fire burns, or when you learned enough German to argue with a landlord, something happened that we do not fully understand and cannot yet reproduce. When we say a machine "learns," we mean something far narrower — and getting clear on exactly how narrow is the single most useful thing a builder can do. Almost every overclaim and almost every disappointment in this field traces back to smuggling the rich human meaning of *learning* into a place where only the narrow technical meaning applies.

## 1.1 A model is a function fit to examples

Strip away the marketing and a machine-learning system is a :::glossary term="Model"::: — a mathematical function that takes some input and produces some output. A spam filter takes an email and outputs *spam* or *not spam*. A demand forecaster takes yesterday's sales and outputs tomorrow's estimate. What makes it *machine* learning rather than ordinary programming is where the function comes from. You do not write the rules by hand. You show the system many examples and let it adjust itself until its outputs match the examples well.

Two words do most of the work here. A :::glossary term="Feature"::: is a piece of input the system is allowed to look at: the words in the email, the day of the week, the customer's past orders. A :::glossary term="Label"::: is the answer you want it to produce: *spam*, or the actual sales figure that day. When you have examples that pair features with the correct labels, and you use them to shape the function, you are doing :::glossary term="Supervised learning":::[^supervised] — by far the most common kind, and the one worth understanding first.

:::definition term="Model"
In machine learning, a model is a function — a rule for turning inputs into outputs — whose internal settings (its *parameters*) have been adjusted to fit a collection of examples. "Model" does not mean a theory of how the world works, in the way a physicist has a model of gravity. It means a fitted input-output mapping. A model can predict extremely well while embodying no understanding of *why* its inputs and outputs go together.
:::

Here is the whole idea in a few lines of pseudocode. It is deliberately tiny; real systems differ in scale and cleverness, not in shape.

```
model = start_with_random_settings()

repeat many times:
    for each example (features, correct_label) in training_data:
        guess = model.predict(features)
        error = difference(guess, correct_label)
        model.adjust_settings_to_reduce(error)

# afterwards, on an email it has never seen:
prediction = model.predict(new_email_features)
```

That loop — guess, measure how wrong you were, nudge the settings, repeat — is the beating heart of the field. A modern large language model does something recognisably like this across an unimaginable number of examples and settings, but the logic is the logic above. There is no comprehension in the loop. There is a function being bent, patiently, toward a set of examples.

:::check reread="1.1"
question: In machine-learning terms, what is the difference between a *feature* and a *label*?
- A feature is the correct answer the system should produce; a label is the raw input it looks at.
- A feature is a piece of the input the system is allowed to use; a label is the answer it is being trained to produce.
- Features are used during training and labels are used during prediction; they never appear together.
- They are two words for the same thing, chosen for variety.
answer: 2
explanation: Features are the inputs — the words in an email, the day of the week — and labels are the target answers — *spam*, or the actual sales figure. Supervised learning works by pairing features with correct labels in the examples and adjusting the model until its outputs match. Keeping the two straight is the foundation for everything that follows.
:::

## 1.2 Training and inference are two different worlds

The pseudocode above quietly contains two phases that it is worth prising apart, because builders live in the gap between them.

The first phase is :::glossary term="Training":::. This is the expensive, slow, one-time-ish process of running the loop — showing examples, measuring error, adjusting settings — until the model fits the data well. Training is where the electricity bill lives, where the specialised hardware is needed, and where the examples matter enormously.

The second phase is :::glossary term="Inference":::. This is using the finished model on new input: the email arrives, the model outputs *spam*, done. Inference is comparatively cheap and fast. When you type a prompt into a chatbot, you are not training it; you are running inference against a model whose settings were frozen long ago.

Why does the distinction matter to you specifically? Because the model does not keep learning from you at inference time unless someone deliberately built a pipeline to feed your interactions back into a future round of training. The system that feels like it is "getting to know you" over an evening is, more often than not, simply applying a fixed function to a longer input. And because the training data was gathered at some point in the past, a deployed model is a photograph of the world as it was when the examples were collected — a point we will lean on hard in Chapter 2.

## 1.3 Generalization, not memorization

Now for the idea that separates a useful model from a useless one. Suppose you train a spam filter and it labels every email in the training set perfectly. Is that good? Not necessarily. It is trivial to build a system that memorises the training examples and parrots back their labels — a lookup table would do it. Such a system would be flawless on emails it has already seen and worthless on the next email that arrives, which is the only kind that matters.

The property we actually want is :::glossary term="Generalization":::: performing well on new, unseen inputs drawn from the same broad situation. A model generalises when it has captured a pattern that holds beyond the specific examples, rather than the examples themselves. This is the whole game. Training accuracy is easy and nearly meaningless; performance on held-out data you never trained on is the number that tells the truth.

The characteristic failure is :::glossary term="Overfitting":::[^overfit] — when a model learns the training examples *too* well, including their noise and accidents, and so performs worse on new data. Think of a student who memorises last year's exam paper word for word. They will ace that paper and stumble on this year's, because they learned the answers, not the subject. Overfitting is the machine version of memorising the answer key.

:::definition term="Overfitting"
Overfitting occurs when a model fits its training examples so closely that it captures their incidental noise — the coincidences and quirks of that particular sample — rather than the general pattern. The symptom is a widening gap: excellent performance on training data, disappointing performance on new data. The usual defences are more and more varied data, deliberately simpler models, and always measuring on examples the model has never seen.
:::

There is a mirror-image failure, *underfitting*, where the model is too simple to capture even the real pattern and does poorly everywhere. The craft of machine learning lives in the tension between these two — between a model rich enough to catch the true signal and disciplined enough not to chase noise. But for a builder, the single most important habit is cultural, not mathematical: never trust a number measured on the data the model was trained on. Insist on the held-out number.

:::check reread="1.3"
question: A demand-forecasting model predicts last quarter's sales with 100% accuracy but performs badly on this quarter. What has most likely happened?
- The model has generalised well and the new quarter is simply unpredictable.
- The model has overfit — it memorised the quirks of last quarter's data instead of learning a pattern that transfers.
- The model was not trained for long enough and needs to see last quarter's data again.
- Perfect accuracy on the training data proves the model is correct; the business changed.
answer: 2
explanation: Flawless performance on the data a model was trained on, paired with poor performance on new data, is the signature of overfitting. The fix is not more exposure to the same quarter — that deepens the problem — but more varied data, a simpler model, and honest measurement on held-out examples. A perfect training score is a warning sign, not a trophy.
:::

## 1.4 Why more data and pattern-matching is not understanding

Here is where builders and headlines part ways. It is tempting to reason: if the model predicts so well, it must in some sense *understand* the thing it predicts. That inference is exactly the one to resist.

A model finds statistical regularities — reliable co-occurrences between features and labels. That a certain phrasing co-occurs with spam, that certain weather co-occurs with higher ice-cream sales, that certain words tend to follow certain other words. These regularities can be astonishingly predictive without the model possessing any notion of what spam is *for*, why heat makes people want ice cream, or what any sentence *means*. Prediction and comprehension can come apart, and in these systems they routinely do.

:::argument title="The competence-without-comprehension view"
conclusion: A system can be genuinely competent at a task — reliably producing correct outputs — without understanding the task in anything like the way a person does.
premise: The model's competence comes entirely from statistical patterns linking features to labels in its training data.
premise: Those patterns can be captured and exploited without any representation of meaning, purpose, or cause.
premise: We already accept competence-without-comprehension elsewhere: a thermostat regulates temperature and a calculator multiplies flawlessly, neither understanding heat or number.
premise: Therefore high performance is evidence of captured regularity, not of understanding, and the two should not be conflated.
:::

:::counter title="Objection: at some scale, prediction may just be understanding" to="The competence-without-comprehension view"
The strongest reply is that "understanding" might be nothing more than prediction done thoroughly enough. To reliably predict the next word across billions of sentences about physics, law, and human motives, a system may be forced to build internal structures that represent how those things actually work — because a shallow lookup would fail. On this view, dismissing large models as "mere pattern-matching" begs the question, since our own understanding might also be pattern-matching implemented in neurons. If a system can answer novel questions, correct its own errors, and transfer a principle to a new domain, insisting it still does not "really" understand starts to look like moving the goalposts. This is a live and serious debate, not a settled one, and an honest builder should hold the competence-comprehension distinction as a working assumption rather than a proven law.
:::

Both positions deserve to be held in view. The practical point for a builder sits underneath the philosophy: whatever is happening inside the model, its competence is bounded by the regularities in its data. Where the world stops matching that data, the competence quietly stops too — and the system will not tell you it has stopped. That is the theme of the next chapter.

:::uncertainty title="How much data, and how big, is enough?"
Popular accounts attach specific figures to modern systems — parameter counts, dataset sizes, the exact benchmark scores at which new abilities are said to "emerge." These numbers change with every release and are easy to state carelessly. This book therefore avoids committing to any specific figure for model size, training-set size, or benchmark performance. Citation needed — verify before publishing. Treat any precise number you encounter in this fast-moving field as provisional, and check it against the primary source and its date before you rely on it.
:::

:::reflect
Think of one tool you already rely on that "learns from data" — a recommender, an autocomplete, a forecasting dashboard at work. Write down, in your own words, what its *features* and *labels* probably are, and one situation in which it would fail because the new input no longer resembles its training data. Keep what you write; you will test it against the failure modes in Chapter 2.
:::

The narrow meaning of *learning*, then, is this: a function is fitted to examples so that it generalises to new cases drawn from the same world. That is a real and powerful thing. It is not knowledge, not understanding, not judgement — and mistaking it for those is the first and most expensive error a builder can make. Knowing exactly what the machine is doing is not a way of belittling it. It is the only way to use it well.

[^supervised]: The canonical reference for the whole landscape — supervised learning, features, labels, generalization, and much else — is Stuart Russell and Peter Norvig, *Artificial Intelligence: A Modern Approach* (Pearson, multiple editions). A more narrative treatment aimed at non-specialists is Melanie Mitchell, *Artificial Intelligence: A Guide for Thinking Humans* (Farrar, Straus and Giroux, 2019).
[^overfit]: The tension between fitting the data and generalising to new cases — the bias–variance trade-off behind overfitting and underfitting — is treated in any standard text; see again Russell and Norvig, *Artificial Intelligence: A Modern Approach*.
