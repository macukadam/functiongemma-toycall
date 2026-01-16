# Fine-Tuning FunctionGemma for Custom Tools

This guide explains how to fine-tune the FunctionGemma 270M model for your own custom tool definitions and deploy it in your Expo app.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Dataset Preparation](#dataset-preparation)
4. [Fine-Tuning Process](#fine-tuning-process)
5. [Model Conversion](#model-conversion)
6. [Deployment](#deployment)
7. [Best Practices](#best-practices)

---

## Overview

FunctionGemma is designed to be fine-tuned for specific function-calling tasks. The base model has general function-calling capabilities, but fine-tuning significantly improves accuracy for your specific use case.

### Why Fine-Tune?

| Scenario | Base Model | Fine-Tuned |
|----------|------------|------------|
| Mobile Actions (Google's benchmark) | 58% | 85% |
| Custom domain tools | Variable | 80-95% |

---

## Prerequisites

### Hardware Requirements

- **GPU**: NVIDIA GPU with 8GB+ VRAM (T4, RTX 3080, A100, etc.)
- **RAM**: 16GB+ system memory
- **Storage**: 20GB+ free space

### Software Requirements

```bash
# Python 3.10+
python --version

# Install required packages
pip install torch transformers datasets peft accelerate bitsandbytes
pip install ai-edge-torch ai-edge-litert
```

### Accounts Needed

- [Hugging Face](https://huggingface.co/) account (for model access)
- Accept the [Gemma license](https://ai.google.dev/gemma/terms)

---

## Dataset Preparation

### Dataset Format

Create a dataset with the following structure:

```json
{
  "messages": [
    {
      "role": "developer",
      "content": "You are a model that can do function calling with the following functions"
    },
    {
      "role": "user",
      "content": "Turn on dark mode"
    },
    {
      "role": "assistant",
      "content": "<start_function_call>call:change_theme{theme:<escape>dark<escape>}<end_function_call>"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "change_theme",
        "description": "Changes the app theme",
        "parameters": {
          "type": "object",
          "properties": {
            "theme": {
              "type": "string",
              "enum": ["light", "dark", "toggle"]
            }
          },
          "required": ["theme"]
        }
      }
    }
  ]
}
```

### Creating Training Data

#### Step 1: Define Your Tools

```python
# tools.py
CUSTOM_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "play_music",
            "description": "Plays music from the user's library",
            "parameters": {
                "type": "object",
                "properties": {
                    "song": {"type": "string", "description": "Song name"},
                    "artist": {"type": "string", "description": "Artist name"},
                    "shuffle": {"type": "boolean", "description": "Enable shuffle"}
                },
                "required": ["song"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "set_alarm",
            "description": "Sets an alarm",
            "parameters": {
                "type": "object",
                "properties": {
                    "time": {"type": "string", "description": "Time in HH:MM format"},
                    "label": {"type": "string", "description": "Alarm label"},
                    "repeat": {"type": "string", "enum": ["once", "daily", "weekdays"]}
                },
                "required": ["time"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_message",
            "description": "Sends a text message",
            "parameters": {
                "type": "object",
                "properties": {
                    "recipient": {"type": "string", "description": "Contact name"},
                    "message": {"type": "string", "description": "Message content"}
                },
                "required": ["recipient", "message"]
            }
        }
    }
]
```

#### Step 2: Generate Training Examples

```python
# generate_dataset.py
import json
import random

def create_training_example(user_input, function_name, params):
    """Create a single training example."""
    # Format parameters
    params_str = ",".join([
        f"{k}:<escape>{v}<escape>" 
        for k, v in params.items()
    ])
    
    assistant_response = f"<start_function_call>call:{function_name}{{{params_str}}}<end_function_call>"
    
    return {
        "messages": [
            {
                "role": "developer",
                "content": "You are a model that can do function calling with the following functions"
            },
            {
                "role": "user", 
                "content": user_input
            },
            {
                "role": "assistant",
                "content": assistant_response
            }
        ],
        "tools": CUSTOM_TOOLS
    }

# Example training data
training_examples = [
    # play_music examples
    create_training_example(
        "Play Bohemian Rhapsody",
        "play_music",
        {"song": "Bohemian Rhapsody"}
    ),
    create_training_example(
        "Play some Beatles music",
        "play_music", 
        {"artist": "The Beatles", "shuffle": "true"}
    ),
    create_training_example(
        "I want to listen to Hotel California by Eagles",
        "play_music",
        {"song": "Hotel California", "artist": "Eagles"}
    ),
    
    # set_alarm examples
    create_training_example(
        "Wake me up at 7 AM",
        "set_alarm",
        {"time": "07:00"}
    ),
    create_training_example(
        "Set an alarm for 6:30 every weekday",
        "set_alarm",
        {"time": "06:30", "repeat": "weekdays"}
    ),
    create_training_example(
        "Remind me at 3 PM to call mom",
        "set_alarm",
        {"time": "15:00", "label": "Call mom"}
    ),
    
    # send_message examples
    create_training_example(
        "Text John that I'll be late",
        "send_message",
        {"recipient": "John", "message": "I'll be late"}
    ),
    create_training_example(
        "Send a message to Mom saying happy birthday",
        "send_message",
        {"recipient": "Mom", "message": "Happy birthday!"}
    ),
]

# Save dataset
with open("training_data.jsonl", "w") as f:
    for example in training_examples:
        f.write(json.dumps(example) + "\n")

print(f"Created {len(training_examples)} training examples")
```

#### Step 3: Data Augmentation (Recommended)

```python
# augment_data.py
import random

# Variations for each intent
PLAY_MUSIC_TEMPLATES = [
    "Play {song}",
    "I want to hear {song}",
    "Can you play {song}?",
    "Put on {song}",
    "Start playing {song}",
    "Play {song} by {artist}",
    "I'd like to listen to {song}",
]

SET_ALARM_TEMPLATES = [
    "Set an alarm for {time}",
    "Wake me up at {time}",
    "Alarm at {time}",
    "I need to wake up at {time}",
    "Set a {time} alarm",
    "Remind me at {time}",
]

def augment_dataset(base_examples, templates, num_augmented=100):
    """Generate augmented training examples."""
    augmented = []
    
    for _ in range(num_augmented):
        template = random.choice(templates)
        # Fill in template with random values
        # ... implementation depends on your domain
        
    return augmented
```

### Dataset Size Recommendations

| Use Case | Minimum Examples | Recommended |
|----------|------------------|-------------|
| Simple (3-5 tools) | 100 | 500+ |
| Medium (5-10 tools) | 500 | 2000+ |
| Complex (10+ tools) | 1000 | 5000+ |

---

## Fine-Tuning Process

### Option 1: Using Hugging Face + LoRA (Recommended)

```python
# finetune.py
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoProcessor,
    TrainingArguments,
    Trainer
)
from peft import LoraConfig, get_peft_model
from datasets import load_dataset

# Load base model
model_name = "google/functiongemma-270m-it"
processor = AutoProcessor.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.bfloat16,
    device_map="auto"
)

# Configure LoRA
lora_config = LoraConfig(
    r=16,                          # Rank
    lora_alpha=32,                 # Alpha scaling
    target_modules=[               # Layers to adapt
        "q_proj", 
        "k_proj", 
        "v_proj", 
        "o_proj",
        "gate_proj",
        "up_proj", 
        "down_proj"
    ],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

# Apply LoRA
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# Load dataset
dataset = load_dataset("json", data_files="training_data.jsonl")

# Tokenize function
def tokenize_function(examples):
    # Apply chat template with tools
    texts = []
    for messages, tools in zip(examples["messages"], examples["tools"]):
        text = processor.apply_chat_template(
            messages,
            tools=tools,
            add_generation_prompt=False,
            tokenize=False
        )
        texts.append(text)
    
    return processor(
        texts,
        truncation=True,
        max_length=512,
        padding="max_length"
    )

tokenized_dataset = dataset.map(tokenize_function, batched=True)

# Training arguments
training_args = TrainingArguments(
    output_dir="./functiongemma-custom",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    weight_decay=0.01,
    warmup_steps=100,
    logging_steps=10,
    save_steps=500,
    bf16=True,
    optim="adamw_torch",
)

# Create trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset["train"],
)

# Train!
trainer.train()

# Save the model
model.save_pretrained("./functiongemma-custom-final")
processor.save_pretrained("./functiongemma-custom-final")
```

### Option 2: Using Google's Colab Notebook

Google provides an official fine-tuning notebook:
[FunctionGemma Fine-Tuning Notebook](https://github.com/google-gemini/gemma-cookbook/blob/main/FunctionGemma/%5BFunctionGemma%5DFinetune_FunctionGemma_270M_for_Mobile_Actions_with_Hugging_Face.ipynb)

---

## Model Conversion

After fine-tuning, convert the model to LiteRT format for on-device inference.

### Step 1: Merge LoRA Weights

```python
# merge_weights.py
from peft import PeftModel
from transformers import AutoModelForCausalLM

# Load base model
base_model = AutoModelForCausalLM.from_pretrained(
    "google/functiongemma-270m-it",
    torch_dtype=torch.bfloat16
)

# Load and merge LoRA weights
model = PeftModel.from_pretrained(base_model, "./functiongemma-custom-final")
model = model.merge_and_unload()

# Save merged model
model.save_pretrained("./functiongemma-merged")
```

### Step 2: Convert to LiteRT

```python
# convert_to_litert.py
import torch
import ai_edge_torch
from ai_edge_litert import convert

# Load merged model
model = AutoModelForCausalLM.from_pretrained(
    "./functiongemma-merged",
    torch_dtype=torch.float32  # LiteRT needs float32
)

# Export to AI Edge format
sample_input = torch.randint(0, 1000, (1, 128))

edge_model = ai_edge_torch.convert(
    model,
    sample_args=(sample_input,),
)

# Quantize to INT8 for smaller size
edge_model = ai_edge_torch.quantize(
    edge_model,
    mode="dynamic_int8"
)

# Save as LiteRT model
edge_model.export("./functiongemma-custom.litertlm")

print("Model exported successfully!")
print(f"Size: {os.path.getsize('./functiongemma-custom.litertlm') / 1024 / 1024:.1f} MB")
```

### Alternative: Using Google's AI Edge Tools

```bash
# Install AI Edge tools
pip install ai-edge-torch ai-edge-litert

# Convert using CLI
python -m ai_edge_torch.convert \
    --model_path ./functiongemma-merged \
    --output_path ./functiongemma-custom.litertlm \
    --quantize dynamic_int8 \
    --max_seq_len 1024
```

---

## Deployment

### Step 1: Host Your Model

Upload your `.litertlm` file to a hosting service:

**Option A: Hugging Face**
```bash
# Install git-lfs
git lfs install

# Create a new model repo
huggingface-cli repo create functiongemma-custom --type model

# Upload
git clone https://huggingface.co/YOUR_USERNAME/functiongemma-custom
cp functiongemma-custom.litertlm functiongemma-custom/
cd functiongemma-custom
git add .
git commit -m "Add custom fine-tuned model"
git push
```

**Option B: Cloud Storage (S3, GCS, etc.)**
```bash
# AWS S3
aws s3 cp functiongemma-custom.litertlm s3://your-bucket/models/

# Google Cloud Storage
gsutil cp functiongemma-custom.litertlm gs://your-bucket/models/
```

### Step 2: Update Your App

```typescript
// src/context/LLMContext.tsx

// Update the model URL to your hosted model
const MODEL_URL = 'https://huggingface.co/YOUR_USERNAME/functiongemma-custom/resolve/main/functiongemma-custom.litertlm';
const MODEL_NAME = 'functiongemma-custom.bin';
```

### Step 3: Update Tool Definitions

```typescript
// src/types/tools.ts

export const playMusicTool: Tool = {
  name: "play_music",
  description: "Plays music from the user's library",
  parameters: {
    type: "object",
    properties: {
      song: {
        type: "string",
        description: "Song name",
      },
      artist: {
        type: "string",
        description: "Artist name",
      },
      shuffle: {
        type: "boolean",
        description: "Enable shuffle mode",
      },
    },
    required: ["song"],
  },
};

// Add to availableTools array
export const availableTools: Tool[] = [
  playMusicTool,
  setAlarmTool,
  sendMessageTool,
  // ... your other tools
];
```

### Step 4: Implement Tool Handlers

```typescript
// src/hooks/useToolCalls.ts

case 'play_music': {
  const song = toolCall.parameters.song;
  const artist = toolCall.parameters.artist;
  const shuffle = toolCall.parameters.shuffle === 'true';
  
  onPlayMusic(song, artist, shuffle);
  return {
    success: true,
    message: `Playing ${song}${artist ? ` by ${artist}` : ''}`,
    action: `play_music("${song}")`
  };
}
```

---

## Best Practices

### 1. Dataset Quality

- **Diverse examples**: Include many phrasings for each intent
- **Edge cases**: Include examples with missing optional parameters
- **Negative examples**: Include cases where no tool should be called
- **Consistent formatting**: Always use the exact output format

### 2. Training Tips

- **Start small**: Begin with 100-500 examples and evaluate
- **Learning rate**: Use lower LR (1e-5 to 2e-4) for fine-tuning
- **Epochs**: 2-5 epochs is usually sufficient
- **Validation**: Hold out 10-20% for validation

### 3. Evaluation

```python
# evaluate.py
def evaluate_model(model, test_data):
    correct = 0
    total = 0
    
    for example in test_data:
        user_input = example["messages"][1]["content"]
        expected = example["messages"][2]["content"]
        
        # Generate prediction
        predicted = model.generate(user_input)
        
        # Compare (exact match or parsed comparison)
        if predicted.strip() == expected.strip():
            correct += 1
        total += 1
    
    accuracy = correct / total * 100
    print(f"Accuracy: {accuracy:.1f}%")
    return accuracy
```

### 4. Debugging Common Issues

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| Wrong function called | Insufficient examples | Add more diverse training data |
| Parameters missing | Format inconsistency | Check escape tag formatting |
| Model outputs plain text | System prompt missing | Ensure developer message is included |
| Poor accuracy | Overfitting | Reduce epochs, add regularization |

---

## Resources

- [FunctionGemma Documentation](https://ai.google.dev/gemma/docs/functiongemma)
- [Gemma Cookbook](https://github.com/google-gemini/gemma-cookbook)
- [Mobile Actions Dataset](https://huggingface.co/datasets/google/mobile-actions)
- [AI Edge Torch Documentation](https://github.com/google-ai-edge/ai-edge-torch)
- [MediaPipe LLM Inference](https://developers.google.com/mediapipe/solutions/genai/llm_inference)

---

## Support

If you encounter issues:

1. Check the [expo-llm-mediapipe issues](https://github.com/tirthajyoti-ghosh/expo-llm-mediapipe/issues)
2. Review [FunctionGemma discussions](https://huggingface.co/google/functiongemma-270m-it/discussions)
3. Open an issue in this repository
