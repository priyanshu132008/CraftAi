from ai_engine.services.plan_generator import generate_plan


if __name__ == "__main__":
    print("\n=== CRAFTAI PLAN GENERATOR ===\n")

    user_prompt = input("Enter your idea: ")

    try:
        plan = generate_plan(user_prompt)

        print("\nGenerated Plan:\n")
        print(plan)

    except Exception as e:
        print("\nError:\n", str(e))