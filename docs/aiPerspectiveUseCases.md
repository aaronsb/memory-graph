# Memory Graph Use Cases (AI Perspective)

This document provides practical examples of how to use the Memory Graph MCP server in real-world scenarios. These examples demonstrate the power and flexibility of the domain-based memory system for maintaining context and knowledge across sessions.

## Table of Contents

1. [Documenting Development Workflows](#documenting-development-workflows)
2. [Personal Knowledge Management](#personal-knowledge-management)
3. [Project Documentation](#project-documentation)
4. [Learning and Research](#learning-and-research)
5. [Decision Making](#decision-making)

## Documenting Development Workflows

One powerful use case for the Memory Graph is documenting development workflows and processes. This example shows how to create a comprehensive knowledge base for a GitHub-based development workflow.

### Example: GitHub Development Workflow

In this example, we'll create a domain to document the standard workflow for developing features, testing changes, and submitting pull requests using GitHub.

#### 1. Create a Domain

First, create a dedicated domain for the GitHub workflow:

```typescript
// Create a domain for GitHub development workflow
await memoryGraph.createDomain(
  "github-development-workflow",
  "GitHub Development Workflow",
  "Standard workflow for developing features, testing changes, and submitting pull requests using GitHub"
);

// Select the domain to make it active
await memoryGraph.selectDomain("github-development-workflow");
```

#### 2. Store Step-by-Step Workflow Memories

Store memories for each step in the workflow, with relationships connecting them in sequence:

```typescript
// Step 1: Preparation
const step1 = await memoryGraph.storeMemory({
  content: "The GitHub development workflow begins with understanding the current state of the repository. Use `git status` to check for any existing changes or branches. This helps you understand what you're starting with and avoid conflicts with existing work.",
  path: "/workflow/1-preparation",
  tags: ["git", "workflow", "preparation"]
});

// Step 2: Code Changes
const step2 = await memoryGraph.storeMemory({
  content: "After understanding the repository state, make the necessary code changes. Focus on small, focused modifications that address a single concern. This makes the changes easier to review and reduces the risk of conflicts.",
  path: "/workflow/2-code-changes",
  tags: ["code", "development", "changes"],
  relationships: {
    follows: [
      {
        targetId: step1.id,
        strength: 0.9
      }
    ]
  }
});

// Step 3: Local Testing
const step3 = await memoryGraph.storeMemory({
  content: "After making code changes, build and test the project locally to ensure everything works as expected. For this project, use the `./scripts/build-local.sh` script, which runs linting, tests, TypeScript compilation, and builds a Docker image. This script provides a comprehensive local validation before pushing changes to the remote repository. Always fix any issues found during local testing before proceeding.",
  path: "/workflow/3-local-testing",
  tags: ["testing", "building", "local-development"],
  relationships: {
    follows: [
      {
        targetId: step2.id,
        strength: 0.9
      }
    ]
  }
});

// Additional steps would follow the same pattern...
```

#### 3. Add Supporting Information

Add memories with supporting information, such as tools and best practices:

```typescript
// Tools and commands
const tools = await memoryGraph.storeMemory({
  content: `Key tools and commands used in the GitHub development workflow:

1. Git commands:
   - \`git status\`: Check repository state
   - \`git checkout -b branch-name\`: Create and switch to a new branch
   - \`git add file-path\`: Stage changes
   - \`git commit -m 'message'\`: Commit changes
   - \`git push -u origin branch-name\`: Push to remote

2. Local development scripts:
   - \`./scripts/build-local.sh\`: Build and test locally
   - \`./scripts/run-local.sh\`: Run the local Docker image

3. GitHub CLI commands:
   - \`gh pr create\`: Create a pull request
   - \`gh pr view\`: View pull request details
   - \`gh run list\`: List workflow runs
   - \`gh run view\`: View workflow run details
   - \`gh run view --log --job=job-id\`: View job logs
   - \`gh pr merge\`: Merge a pull request`,
  path: "/tools-and-commands",
  tags: ["git", "github", "cli", "commands", "tools"]
});

// Best practices
const bestPractices = await memoryGraph.storeMemory({
  content: `Best practices for the GitHub development workflow:

1. **Make small, focused changes**: Each branch should address a single concern or feature to simplify review and reduce merge conflicts.

2. **Use descriptive branch names**: Names like 'add-timestamp-to-startup-message' clearly communicate the purpose of the branch.

3. **Write meaningful commit messages**: Use conventional commit format (e.g., 'feat: add timestamp to server startup message') to clearly communicate the purpose of each commit.

4. **Test locally before pushing**: Always run the local build script to catch issues early.

5. **Monitor CI/CD workflows**: Check the status of automated tests and builds after pushing changes.

6. **Address feedback promptly**: Respond to code review comments and make necessary changes quickly.

7. **Keep the main branch stable**: Only merge code that passes all tests and has been reviewed.

8. **Clean up after merging**: Delete feature branches after they've been merged to keep the repository clean.

9. **Document significant changes**: Update documentation when making substantial changes to the codebase.

10. **Follow project conventions**: Adhere to the project's coding style, commit message format, and workflow patterns.`,
  path: "/best-practices",
  tags: ["github", "workflow", "best-practices", "development"]
});
```

#### 4. Create a Summary Memory

Create a summary memory that synthesizes all the individual steps:

```typescript
// Summary memory
await memoryGraph.storeMemory({
  content: "The GitHub development workflow follows a standard pattern: (1) Understand the current state with git status, (2) Make code changes, (3) Build and test locally, (4) Create a branch and commit changes, (5) Push to remote, (6) Create a pull request, (7) Monitor CI/CD workflows, (8) Address any failures, (9) Participate in the review process, and (10) Merge the approved pull request. This workflow ensures code quality, facilitates collaboration, and maintains a stable main branch.",
  path: "/workflow/summary",
  tags: ["github", "workflow", "summary", "development-process"],
  relationships: {
    synthesizes: [
      // References to all the step memories
      {targetId: step1.id, strength: 0.8},
      {targetId: step2.id, strength: 0.8},
      {targetId: step3.id, strength: 0.8},
      // ... additional steps
    ],
    relates_to: [
      {targetId: tools.id, strength: 0.7},
      {targetId: bestPractices.id, strength: 0.7}
    ]
  }
});
```

#### 5. Visualize the Workflow

Generate a Mermaid graph to visualize the workflow:

```typescript
// First recall the summary memory
const memories = await memoryGraph.recallMemories({
  maxNodes: 1,
  strategy: "path",
  path: "/workflow/summary"
});

// Generate a Mermaid graph starting from the summary memory
const graph = await memoryGraph.generateMermaidGraph({
  startNodeId: memories[0].node.id,
  maxDepth: 2,
  direction: "LR",
  contentFormat: {
    maxLength: 50,
    truncationSuffix: "...",
    includeTimestamp: false
  }
});

// The resulting graph will show the relationships between all workflow steps
```

#### 6. Recall Workflow Information

Later, you can recall information about the workflow:

```typescript
// Recall the entire workflow
const workflowSteps = await memoryGraph.recallMemories({
  maxNodes: 10,
  strategy: "path",
  path: "/workflow",
  sortBy: "path"  // Sort by path to get steps in order
});

// Search for specific information
const cicdInfo = await memoryGraph.recallMemories({
  maxNodes: 5,
  strategy: "content",
  search: {
    keywords: ["CI/CD", "GitHub Actions", "workflow"]
  }
});

// Get best practices
const practices = await memoryGraph.recallMemories({
  maxNodes: 1,
  strategy: "path",
  path: "/best-practices"
});
```

This example demonstrates how the Memory Graph can be used to document complex workflows, making the information easily accessible and well-organized for future reference.

## Personal Knowledge Management

The Memory Graph is an excellent tool for personal knowledge management, allowing you to build a personalized knowledge base over time.

### Example: Building a Personal Learning System

```typescript
// Create a domain for personal learning
await memoryGraph.createDomain(
  "personal-learning",
  "Personal Learning System",
  "Knowledge, insights, and resources from personal learning activities"
);

// Store memories about books read
await memoryGraph.storeMemory({
  content: "Key insights from 'Thinking, Fast and Slow' by Daniel Kahneman: The book introduces two systems of thinking - System 1 (fast, intuitive) and System 2 (slow, deliberate). Most cognitive biases arise from System 1's shortcuts.",
  path: "/books/psychology",
  tags: ["psychology", "cognitive-bias", "decision-making"]
});

// Store memories about online courses
await memoryGraph.storeMemory({
  content: "From the Machine Learning course: The bias-variance tradeoff is fundamental to understanding model performance. High bias leads to underfitting, while high variance leads to overfitting.",
  path: "/courses/machine-learning",
  tags: ["machine-learning", "statistics", "models"]
});

// Create connections between related concepts
await memoryGraph.storeMemory({
  content: "Cognitive biases in machine learning: Our intuitive thinking (System 1) can lead us to misinterpret model results and overlook important patterns in data. Always use systematic evaluation methods.",
  path: "/connections",
  tags: ["psychology", "machine-learning", "cognitive-bias"],
  relationships: {
    synthesizes: [
      // References to the book and course memories
      {targetId: "book-memory-id", strength: 0.8},
      {targetId: "course-memory-id", strength: 0.8}
    ]
  }
});
```

## Project Documentation

The Memory Graph can serve as a living documentation system for projects, capturing decisions, architecture, and implementation details.

### Example: Software Project Documentation

```typescript
// Create a domain for project documentation
await memoryGraph.createDomain(
  "project-docs",
  "Project Documentation",
  "Architecture, decisions, and implementation details for the project"
);

// Document architecture decisions
await memoryGraph.storeMemory({
  content: "We decided to use a microservices architecture to improve scalability and allow independent deployment of components. Each service will have its own database to ensure loose coupling.",
  path: "/architecture/decisions",
  tags: ["architecture", "microservices", "database"]
});

// Document API endpoints
await memoryGraph.storeMemory({
  content: "User Service API: POST /api/users - Creates a new user. Required fields: username, email, password. Returns 201 Created on success with the user object (excluding password).",
  path: "/api/user-service",
  tags: ["api", "user-service", "endpoints"]
});

// Document implementation details
await memoryGraph.storeMemory({
  content: "The authentication flow uses JWT tokens with a 15-minute expiration for access tokens and 7-day expiration for refresh tokens. Refresh tokens are stored in an HTTP-only cookie to prevent XSS attacks.",
  path: "/implementation/auth",
  tags: ["authentication", "security", "jwt"]
});
```

## Learning and Research

The Memory Graph is ideal for organizing research findings and learning materials.

### Example: Research Project

```typescript
// Create a domain for research
await memoryGraph.createDomain(
  "research-project",
  "Research Project",
  "Findings, papers, and insights for the research project"
);

// Store paper summaries
await memoryGraph.storeMemory({
  content: "Paper: 'Attention Is All You Need' (Vaswani et al., 2017) - Introduced the Transformer architecture that relies entirely on attention mechanisms, eliminating recurrence and convolutions. Key innovation is the multi-head self-attention mechanism.",
  path: "/papers/nlp",
  tags: ["transformer", "attention", "nlp"]
});

// Store experimental results
await memoryGraph.storeMemory({
  content: "Experiment #3 Results: The modified attention mechanism improved performance by 3.2% on the benchmark dataset. However, training time increased by 15%, suggesting a trade-off between accuracy and computational efficiency.",
  path: "/experiments/attention",
  tags: ["experiment", "results", "attention"]
});

// Store insights and connections
await memoryGraph.storeMemory({
  content: "The attention mechanism's effectiveness seems to correlate with dataset diversity. Our experiments show diminishing returns on homogeneous datasets, suggesting that attention benefits most from capturing diverse patterns.",
  path: "/insights",
  tags: ["attention", "datasets", "insights"],
  relationships: {
    derives_from: [
      {targetId: "paper-memory-id", strength: 0.7},
      {targetId: "experiment-memory-id", strength: 0.9}
    ]
  }
});
```

## Decision Making

The Memory Graph can help track decision-making processes and their outcomes over time.

### Example: Product Decisions

```typescript
// Create a domain for product decisions
await memoryGraph.createDomain(
  "product-decisions",
  "Product Decisions",
  "Decision-making process and outcomes for product features"
);

// Document a decision
await memoryGraph.storeMemory({
  content: "Decision: Implement dark mode as a priority feature for Q2. Rationale: User feedback shows strong demand (mentioned in 32% of feedback), competitors have added this feature, and it aligns with our accessibility goals.",
  path: "/features/dark-mode/decision",
  tags: ["dark-mode", "ui", "accessibility", "q2"]
});

// Document implementation approach
await memoryGraph.storeMemory({
  content: "Implementation approach for dark mode: We'll use CSS variables for theming with a centralized color system. The theme will be toggled via user preference and respect the system-level setting by default.",
  path: "/features/dark-mode/implementation",
  tags: ["dark-mode", "css", "theming"],
  relationships: {
    follows: [
      {targetId: "decision-memory-id", strength: 0.9}
    ]
  }
});

// Document outcome
await memoryGraph.storeMemory({
  content: "Dark mode outcome: Feature launched in week 7 of Q2. User engagement increased by 12% in the first week, with 45% of users enabling dark mode. Positive sentiment in feedback increased by 8%.",
  path: "/features/dark-mode/outcome",
  tags: ["dark-mode", "metrics", "outcome"],
  relationships: {
    follows: [
      {targetId: "implementation-memory-id", strength: 0.9}
    ]
  }
});
```

These examples demonstrate the versatility of the Memory Graph for various use cases. By organizing memories into domains and establishing relationships between them, you can build a rich knowledge base that preserves context and connections across different areas of interest or work.
