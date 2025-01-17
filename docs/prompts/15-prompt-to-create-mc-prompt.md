# Prompt to Create a Multiple Choice Prompt

!!! prompt
    Please create a generative AI prompt for me that will create a high quality multiple choice question on a concept in the signalprocessingconcepts file.  This is a CSV file where there is one line per concept.  The prompt should help determine if the student understands the concept.

    Use the following format Output Format in the prompt you return

    #### [Question stem]

    <div class="upper-alpha" markdown>
    1. First item
    2. Second item
    3. Third item
    4. Fourth item
    </div>

    ??? Question "Show Answer"
        The correct answer is **[LETTER]**. Explanation of why [LETTER] is the correct answer.
    
    **Explanation:**

    [Detailed explanation including why the correct answer is right and why each wrong answer is incorrect]

    **Dependencies:** [List any prerequisite concepts from the CSV]

    - [Dependency 1]
    - [Dependency 2]

## Response

I'll help create a prompt that will generate effective multiple choice questions. Let me first examine the CSV file to understand the concepts available.

Based on the data I've examined, I'll create a prompt that will help generate high-quality multiple choice questions. Here's the prompt:

Create a multiple choice question for the signal processing concept "[Concept Name]". Follow these requirements:

### 1. Question Format:

- Write a scenario-based question that tests conceptual understanding
- The question should require application of knowledge, not just definition recall
- Include real-world context where appropriate
- Target a undergraduate engineering student's knowledge level

### 2. Answer Choices:

- Provide exactly 4 options (A, B, C, D)
- Make all options plausible and similar in length
- Include common misconceptions as distractors
- Avoid obvious wrong answers
- Make the correct answer unambiguously right
- Format each option to complete the question stem or as a standalone answer

### 3. Required Components:

- Question stem
- 4 answer choices
- Correct answer indicated
- Brief explanation of why the correct answer is right
- Brief explanations of why each wrong answer is incorrect

### 4. Technical Requirements:

- Ensure all mathematical notation is clear and consistent
- If equations are used, they should be properly formatted
- Include units where applicable
- Avoid double-barreled questions

Output Format:
#### [Question stem]

#### Question Text

<div class="upper-alpha" markdown>
1. First item
2. Second item
3. Third item
4. Fourth item
</div>

Correct Answer: [Letter]

Explanation:

[Detailed explanation including why the correct answer is right and why each wrong answer is incorrect]

Dependencies: [List any prerequisite concepts from the CSV]

## Explanation

This prompt structure is designed to:

1. Generate questions that test understanding rather than memorization
2. Create plausible distractors based on common misconceptions
3. Include proper context and real-world applications
4. Maintain consistent technical rigor
5. Provide clear explanations for learning purposes

Would you like me to demonstrate how this prompt works with a specific concept from the CSV file?

## Testing the Prompt
Yes

Create a multiple choice question for the signal processing concept "Phasors":

Q: An electrical engineer is analyzing an AC circuit with a voltage signal V(t) = 120cos(377t + 30°) volts. Which phasor representation correctly describes this voltage signal at ω = 377 rad/s?

A) 120∠30° V
B) 120∠-30° V
C) 85∠30° V
D) 169.7∠30° V

**Correct Answer:** A

Explanation:

The correct answer is A) 120∠30° V because:

- The phasor representation captures the amplitude and phase angle of a sinusoidal signal
- For a cosine function A*cos(ωt + φ), the phasor form is A∠φ
- The amplitude (120) and phase angle (30°) directly transfer to the phasor notation
- No additional conversion is needed for cosine functions (unlike sine functions)

Why other answers are wrong:

B) 120∠-30° V: This represents a different signal with opposite phase shift
C) 85∠30° V: This incorrectly converts the peak value to RMS (which isn't needed for phasor notation)
D) 169.7∠30° V: This incorrectly multiplies the amplitude by √2 (mixing up RMS conversion)

Dependencies: Complex numbers, Euler's formula