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
            try:
                json_obj = json.loads(action_match.group(0).strip())
                # 检查解析出来的对象是否是列表
                if not isinstance(json_obj, list):
                    raise ValueError("Parsed JSON is not a list")
                # 检查列表中是否包含至少三个元素
                if len(json_obj) < 3:
                    raise ValueError("Parsed JSON list does not contain at least three elements")
                # 检查列表中的元素是否都是字符串
                if not all(isinstance(item, str) for item in json_obj):
                    raise ValueError("Not all elements in the parsed JSON list are strings")
                # 如果通过所有检查，返回前三个元素
                return json_obj[:3]
            except json.JSONDecodeError as e:
                raise ValueError(f"Failed to parse JSON from action match: {e}")
        else:
            json_obj = []
            print(f"Could not parse LLM output: {text}")
            try:
                # 直接尝试解析整个文本为 JSON 对象
                json_obj = json.loads(text.strip())
                return [value for key, value in json_obj.items() if key.startswith("question")][:3]
            except json.JSONDecodeError as e:
                print("Could not parse LLM output at last")
                raise ValueError(f"Failed to parse JSON at last: {e}")
