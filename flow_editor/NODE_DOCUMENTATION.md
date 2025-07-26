# Flow Editor Node Documentation

This document provides an overview of all available nodes in the Sypnex OS Flow Editor. Each node represents a specific functionality that can be connected together to create powerful workflows.

## Data Processing Nodes

### JSON Node
**Purpose**: Parse, manipulate, and transform JSON data structures.
**Use Cases**: 
- Extract specific fields from API responses
- Transform data structure between different formats
- Validate JSON data integrity
**Example**: Parse user data from an API and extract just the name and email fields.

### String Node
**Purpose**: Perform text manipulation operations like concatenation, splitting, and formatting.
**Use Cases**:
- Format text output for display
- Clean and sanitize user input
- Extract substrings or patterns
**Example**: Take a full name and split it into first and last name components.

### Math Node
**Purpose**: Execute mathematical operations and calculations.
**Use Cases**:
- Perform arithmetic on numeric data
- Calculate percentages, averages, or totals
- Convert between units
**Example**: Calculate the total price including tax from a base price.

### Array Node
**Purpose**: Manipulate arrays and lists of data.
**Use Cases**:
- Sort, filter, or search arrays
- Combine multiple arrays
- Extract specific elements by index
**Example**: Sort a list of products by price or filter items above a certain threshold.

### Node Reference Node
**Purpose**: Access output data from any previously executed node in the workflow.
**Use Cases**:
- Reference data from nodes that aren't directly connected
- Create complex data flows without visual clutter
- Access historical node results for comparison
**Example**: Use data from a node executed 5 steps earlier without drawing connection lines across the entire workflow.

### Random Node
**Purpose**: Generate random numbers within specified ranges.
**Use Cases**:
- Create test data for workflows
- Add randomization to decision-making processes
- Generate unique identifiers or tokens
**Example**: Generate random prices for testing an e-commerce workflow.

## Input/Output Nodes

### HTTP Node
**Purpose**: Make HTTP requests to external APIs and web services.
**Use Cases**:
- Fetch data from REST APIs
- Send data to webhooks
- Integrate with third-party services
**Example**: Fetch weather data from an external weather API.

### VFS Read Node
**Purpose**: Read files from the Sypnex OS Virtual File System.
**Use Cases**:
- Load configuration files
- Read user-uploaded documents
- Access stored workflow results
**Example**: Load a CSV file containing customer data for processing.

### VFS Write Node
**Purpose**: Write data to files in the Sypnex OS Virtual File System.
**Use Cases**:
- Save workflow results
- Export processed data
- Create reports and logs
**Example**: Save a processed dataset as a JSON file for later use.

### VFS Directory List Node
**Purpose**: List contents of directories in the Virtual File System.
**Use Cases**:
- Browse available files
- Check for file existence
- Process multiple files in a directory
**Example**: List all CSV files in a data directory for batch processing.

## Flow Control Nodes

### For Each Node
**Purpose**: Iterate over arrays or lists, executing connected nodes for each item.
**Use Cases**:
- Process multiple records individually
- Batch operations on datasets
- Apply transformations to each item in a collection
**Example**: Send an email to each user in a customer list.

### Timer Node
**Purpose**: Add delays or scheduling to workflow execution.
**Use Cases**:
- Rate limiting API calls
- Adding delays between operations
- Scheduling workflow execution
**Example**: Wait 5 seconds between API requests to avoid rate limiting.

### Condition Node
**Purpose**: Implement if/then logic with conditional branching.
**Use Cases**:
- Route data based on conditions
- Validate input before processing
- Handle different scenarios in workflows
**Example**: Only send notifications if a value exceeds a threshold.

### Logical Gate Node
**Purpose**: Perform boolean logic operations (AND, OR, NOT).
**Use Cases**:
- Combine multiple conditions
- Complex decision-making logic
- Filter data based on multiple criteria
**Example**: Process orders only if they're both paid AND shipped.

## AI and Intelligence Nodes

### LLM Node
**Purpose**: Integrate with Large Language Models for AI-powered text processing.
**Use Cases**:
- Generate human-like text responses
- Analyze sentiment in text
- Summarize large documents
- Extract information from unstructured text
**Example**: Analyze customer feedback and generate sentiment scores.

## Text Processing Nodes

### Text Node
**Purpose**: General text manipulation and formatting operations.
**Use Cases**:
- Format text for output
- Clean and normalize text data
- Apply text transformations
**Example**: Format addresses for mailing labels with proper capitalization.

## System Nodes

### Unknown Node
**Purpose**: Fallback handler for unrecognized node types.
**Use Cases**:
- Development and debugging
- Graceful error handling
- Future node type compatibility
**Example**: Provides error information when an unsupported node type is encountered.

## Node Categories Summary

### Data Processing (6 nodes)
JSON, String, Math, Array, Node Reference, Random

### Input/Output (4 nodes) 
HTTP, VFS Read, VFS Write, VFS Directory List

### Flow Control (4 nodes)
For Each, Timer, Condition, Logical Gate

### AI/Intelligence (1 node)
LLM

### Text Processing (1 node)
Text

### System (1 node)
Unknown

## Common Workflow Patterns

### Data Pipeline Pattern
HTTP → JSON → Array → For Each → VFS Write
*Fetch data from API, parse it, process each item, save results*

### Conditional Processing Pattern  
VFS Read → JSON → Condition → [Different processing paths]
*Load data, check conditions, route to appropriate processing*

### AI Analysis Pattern
VFS Read → Text → LLM → String → VFS Write
*Load document, analyze with AI, format results, save output*

### Data Transformation Pattern
VFS Read → JSON → Math → Array → VFS Write
*Load data, perform calculations, organize results, save output*

## Getting Started Tips

1. **Start Simple**: Begin with basic data flow (Read → Process → Write)
2. **Use Node Reference**: For complex workflows, use Node Reference to access distant data without cluttered connections
3. **Add Conditions**: Use Condition nodes to handle different scenarios gracefully
4. **Test Incrementally**: Build workflows step by step, testing each addition
5. **Save Frequently**: Use VFS Write nodes to save intermediate results

## Best Practices

- **Naming**: Give nodes descriptive names to make workflows self-documenting
- **Error Handling**: Use Condition nodes to validate data before processing
- **Modularity**: Break complex workflows into smaller, reusable sections
- **Testing**: Use Random and Text nodes to create test data for development
- **Documentation**: Use Text nodes as comments to document complex workflow sections

---

*This documentation covers the core 20 nodes available in Sypnex OS Flow Editor v1.0. Additional nodes may be added in future releases.*
