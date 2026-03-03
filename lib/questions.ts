export interface Question {
  id: number;
  text: string;
  contentArea: string;
}

export const ASSESSMENT_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Describe the correct technique for measuring blood pressure.",
    contentArea: "Vital Signs Measurement",
  },
  {
    id: 2,
    text: "What is the normal resting heart rate range for an adult?",
    contentArea: "Normal Values",
  },
  {
    id: 3,
    text: "Explain the difference between systolic and diastolic pressure.",
    contentArea: "Cardiovascular Physiology",
  },
  {
    id: 4,
    text: "At what temperature reading would you consider a patient to have a fever?",
    contentArea: "Normal Values",
  },
  {
    id: 5,
    text: "Name three factors that can affect a patient's blood pressure reading.",
    contentArea: "Patient Assessment Factors",
  },
];

export const PRACTICE_QUESTION: Question = {
  id: 0,
  text: "For this practice question, please introduce yourself and state which medical assistant program you are in. This response is not graded.",
  contentArea: "Practice",
};
