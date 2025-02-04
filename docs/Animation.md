# Animation (Section Under Construction)

Modern webapps are caught between the two extremes of "everything animates everywhere" and "nothing animates ever". To learn to judiciously sprinkle animations in the right places to convey intent, requires judgement and taste. This will take a while.

Animations are hard for several reasons:

- They require thinking about the states in-between the main states, aka the interpolations in-between the keyframes. Most web frameworks are not architected to cater to this. Those transitional states are often prematurity discarded "by construction" through types and data structures that naively made states (which they consider illegal) irrepresentable.
- Animations forces the interface to be fast and smooth. Most webapps barely scrape by with low performance, and thus the lack of animation helps hide sluggishness.
- Animation architectures on the web typical overfit specific use-cases like sending simple, standalone effects to the GPU to avoid janks from CPU. This also removed the forcing function for main thread performance to be good. Most tasteful animations require interactions between various UI elements, gestures, CPU-side computations, etc.
- Modern web frameworks optimize for throughput performance at the expense of latency performance (elaborate)
- Animations require structural ........

## Tips & Tricks

- Some animations should be source of truth for state from which other states are derived (e.g. ?)
- Some animations should be derived from state (e.g. ios 18 photos bottom bar darken & word color flip are a function of scroll pos)

data structure dictate access patterns and control flow, and since animations might affect data structure, I don't believe in wrapping it up obscurely and only provide opaque accessors. E.g. every time someone abstract away the underlying mechanism of some physical animation like spring, decay and others, someone else hacks into it to get e.g. the velocity in order to derive other states from it. Understandable to make opaque due to need to crossing to GPU, but......

send future frames to gpu in case CPU janks

"animate your way to glory" article. Decouple physical clock from logical clock.
