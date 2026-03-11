from eval_ai import JudgeAI
from graph import Graph


def summarize_answers(graph: Graph, judge: JudgeAI):
    answers: str = graph.get_answers()
    print("ANSWERS: ", answers)
    summary: str = judge.summarize(answers)

    return summary
