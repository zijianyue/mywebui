import json
import re
from typing import Any

SUGGESTED_QUESTIONS_AFTER_ANSWER_INSTRUCTION_PROMPT = (
    "请预测用户可能会问的三个问题。这些问题应是用户可能提出的，而不是向用户提出的问题。问题必须准确，以免影响用户体验。"
    "每个问题的长度不能超过20个字符。\n"
    "不要重复用户已问过的问题。\n"
    "确保输出语言与助手最新回复一致（如果回复是中文，则输出也必须是中文）。\n"
    "输出格式必须是三个问题的JSON数组（最外层有中括号），不需要格式标记，遵循以下格式：\n"
    "[\"question1\",\"question2\",\"question3\"]\n"
    "不要下面这样的格式：\n"
    "{\"question1\":\"训练方案具体是怎样的？\",\"question2\":\"改善效果如何评估？\",\"question3\":\"长时间训练会影响孩子吗？\"}\n"
)

class SuggestedQuestionsAfterAnswerOutputParser:

    def get_format_instructions(self) -> str:
        return SUGGESTED_QUESTIONS_AFTER_ANSWER_INSTRUCTION_PROMPT

    def parse(self, text: str) -> Any:
        action_match = re.search(r"\[.*?\]", text.strip(), re.DOTALL)
        if action_match is not None:
            json_obj = json.loads(action_match.group(0).strip())
        else:
            json_obj= []
            print(f"Could not parse LLM output: {text}")
            try:
                # 直接尝试解析整个文本为 JSON 对象
                json_obj = json.loads(text.strip())
            
                # 如果成功解析，将对象转换为列表格式
                questions = [value for key, value in json_obj.items() if key.startswith("question")]
            
                return questions
            except json.JSONDecodeError:
                print(f"Could not parse LLM output again: {text}")
                return []

        return json_obj
