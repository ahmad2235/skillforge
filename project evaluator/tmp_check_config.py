from evaluator import config
print('OPENAI_KEY_LOADED:', bool(config.settings.OPENAI_API_KEY))
print('MODEL:', config.settings.OPENAI_MODEL)
