COURSES = {
    "biology_101": {
        "id": "biology_101",
        "title": "Biology 101",
        "subtitle": "Cell Structure & Energy Flow",
        "modules": [
            {
                "id": 1,
                "name": "Introduction to Cells",
                "content_summary": (
                    "Cells are the fundamental unit of life. All living organisms are composed of cells. "
                    "There are two main types: prokaryotic cells (bacteria) which lack a nucleus, and "
                    "eukaryotic cells (plants, animals, fungi) which have a membrane-bound nucleus. "
                    "Key organelles include the nucleus (genetic control), mitochondria (energy), "
                    "ribosomes (protein synthesis), and the cell membrane (boundary and transport)."
                ),
                "key_concepts": ["cell theory", "prokaryotic vs eukaryotic", "organelles", "cell membrane"],
                "sample_questions": [
                    "What is a cell?",
                    "What is the difference between prokaryotic and eukaryotic cells?",
                    "What does the nucleus do?",
                ],
            },
            {
                "id": 2,
                "name": "Cell Structure & Organelles",
                "content_summary": (
                    "Eukaryotic cells contain specialized organelles. The nucleus contains DNA and directs cell activity. "
                    "Mitochondria generate ATP through cellular respiration — the powerhouse of the cell. "
                    "The endoplasmic reticulum (rough ER with ribosomes, smooth ER without) handles protein and lipid synthesis. "
                    "The Golgi apparatus packages and ships proteins. Lysosomes break down waste. "
                    "Vacuoles store water and nutrients. In plant cells, chloroplasts perform photosynthesis."
                ),
                "key_concepts": ["mitochondria", "endoplasmic reticulum", "Golgi apparatus", "chloroplasts", "ATP"],
                "sample_questions": [
                    "Why is the mitochondria called the powerhouse of the cell?",
                    "What is the difference between rough and smooth ER?",
                    "What organelle is unique to plant cells?",
                ],
            },
            {
                "id": 3,
                "name": "Cell Membrane & Transport",
                "content_summary": (
                    "The cell membrane is a phospholipid bilayer that controls what enters and exits the cell. "
                    "Passive transport (diffusion, osmosis, facilitated diffusion) moves substances from high to low concentration without energy. "
                    "Active transport moves substances against their concentration gradient using ATP energy. "
                    "Endocytosis engulfs large particles; exocytosis releases substances outside the cell. "
                    "The fluid mosaic model describes the membrane as flexible with embedded proteins."
                ),
                "key_concepts": ["phospholipid bilayer", "passive transport", "active transport", "osmosis", "fluid mosaic model"],
                "sample_questions": [
                    "What is osmosis?",
                    "What is the difference between active and passive transport?",
                    "What is the fluid mosaic model?",
                ],
            },
            {
                "id": 4,
                "name": "Cellular Energy & Respiration",
                "content_summary": (
                    "Cellular respiration converts glucose into ATP (energy). "
                    "The three stages are: Glycolysis (cytoplasm, produces 2 ATP), "
                    "Krebs cycle / Citric acid cycle (mitochondria matrix, produces CO2), "
                    "and Electron transport chain (inner mitochondrial membrane, produces ~34 ATP). "
                    "The overall equation: C6H12O6 + 6O2 → 6CO2 + 6H2O + ATP. "
                    "Anaerobic respiration (fermentation) occurs without oxygen, producing lactic acid or ethanol."
                ),
                "key_concepts": ["ATP", "glycolysis", "Krebs cycle", "electron transport chain", "fermentation"],
                "sample_questions": [
                    "What are the stages of cellular respiration?",
                    "How much ATP does cellular respiration produce?",
                    "What is the difference between aerobic and anaerobic respiration?",
                ],
            },
        ],
    },
    "python_fundamentals": {
        "id": "python_fundamentals",
        "title": "Python Fundamentals",
        "subtitle": "Programming from the Ground Up",
        "modules": [
            {
                "id": 1,
                "name": "Variables & Data Types",
                "content_summary": (
                    "Python variables store data values. Unlike statically typed languages, Python infers types automatically. "
                    "Core types: int (whole numbers), float (decimals), str (text in quotes), bool (True/False), "
                    "NoneType (absence of value). Use type() to check type. "
                    "Variables are created by assignment: x = 42. Names are case-sensitive and cannot start with a digit."
                ),
                "key_concepts": ["variables", "int", "float", "str", "bool", "type()"],
                "sample_questions": [
                    "What is a variable?",
                    "What is the difference between int and float?",
                    "How do I check the type of a variable?",
                ],
            },
            {
                "id": 2,
                "name": "Control Flow",
                "content_summary": (
                    "Control flow directs program execution. if/elif/else statements branch based on conditions. "
                    "for loops iterate over sequences (lists, ranges, strings). "
                    "while loops repeat as long as a condition is True. "
                    "break exits a loop early; continue skips to the next iteration. "
                    "Python uses indentation (4 spaces) to define code blocks — no curly braces."
                ),
                "key_concepts": ["if/elif/else", "for loop", "while loop", "break", "continue", "indentation"],
                "sample_questions": [
                    "How do I write an if statement in Python?",
                    "What is the difference between for and while loops?",
                    "How does break work?",
                ],
            },
        ],
    },
}


def get_course(course_id: str) -> dict | None:
    return COURSES.get(course_id)


def get_module(course_id: str, module_id: int) -> dict | None:
    course = get_course(course_id)
    if not course:
        return None
    for mod in course["modules"]:
        if mod["id"] == module_id:
            return mod
    return None


def get_all_courses_summary() -> list[dict]:
    return [
        {
            "id": c["id"],
            "title": c["title"],
            "subtitle": c["subtitle"],
            "module_count": len(c["modules"]),
        }
        for c in COURSES.values()
    ]
