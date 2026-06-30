from enum import StrEnum


class TtsVoiceGender(StrEnum):
    MALE = "male"
    FEMALE = "female"


MALE_OPENAI_VOICE = "onyx"
FEMALE_OPENAI_VOICE = "nova"


def resolve_openai_voice(gender: str) -> str:
    if gender == TtsVoiceGender.FEMALE:
        return FEMALE_OPENAI_VOICE
    return MALE_OPENAI_VOICE


def format_scenario_text(
    *,
    setting: str,
    user_role: str,
    ai_role: str,
    goal: str,
) -> str:
    return (
        f"場面: {setting}\n"
        f"あなたの役: {user_role}\n"
        f"AIの役: {ai_role}\n"
        f"目的: {goal}"
    )


def build_scenario_prompt(
    *,
    setting: str | None,
    user_role: str | None,
    ai_role: str | None,
    goal: str | None,
    scenario_text: str,
) -> str:
    if setting and user_role and ai_role and goal:
        return (
            "Scenario:\n"
            f"- Setting: {setting}\n"
            f"- The learner plays: {user_role}\n"
            f"- You play: {ai_role}\n"
            f"- Conversation goal: {goal}\n\n"
            "Stay in character as the role described above. "
            "Do not break character to teach grammar."
        )

    return (
        "Current scenario context:\n"
        f"{scenario_text}\n\n"
        "Stay in-character as the conversation partner."
    )


def scenario_summary(
    *,
    setting: str | None,
    user_role: str | None,
    ai_role: str | None,
    goal: str | None,
    scenario_text: str,
) -> str:
    if setting:
        return setting
    return scenario_text
