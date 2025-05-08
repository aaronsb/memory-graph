# Memory Graph Use Cases

This document provides practical examples of how to use the Memory Graph MCP server in real-world scenarios. These examples demonstrate both the AI implementation perspective and human usage perspective to give a complete understanding of the system's capabilities.

## Table of Contents

1. [Documenting Development Workflows](#documenting-development-workflows)
2. [Personal Knowledge Management](#personal-knowledge-management)
3. [Project Documentation](#project-documentation)
4. [Learning and Research](#learning-and-research)
5. [Decision Making](#decision-making)
6. [Tips for Effective Memory Management](#tips-for-effective-memory-management)

## Documenting Development Workflows

One powerful use case for the Memory Graph is documenting development workflows and processes. This example shows how to create a comprehensive knowledge base for a GitHub-based development workflow.

### Implementation Approach

1. **Create a Domain**

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

2. **Store Step-by-Step Workflow Memories**

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

3. **Add Supporting Information**

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

### Guiding the AI

Here's how to instruct the AI to document your GitHub workflow:

1. **Setting Up the Knowledge Domain**

Start by instructing the AI to create a dedicated space for your workflow:

"I want you to remember our GitHub development workflow. Create a memory domain called 'github-development-workflow' with a description that explains it's for our standard process of developing features, testing changes, and submitting pull requests."

2. **Teaching the Step-by-Step Process**

Break down your workflow into clear steps and explain each one to the AI:

"Let me walk you through our GitHub workflow. First, we always check the repository state using `git status`. This helps us understand what we're starting with and avoid conflicts. Store this as the first step in our workflow."

"The second step is making code changes. We focus on small, focused modifications that address a single concern. This makes our changes easier to review and reduces the risk of conflicts. Store this as step 2 and connect it to step 1."

"After making changes, we always build and test locally. For our project, we use the `./scripts/build-local.sh` script, which runs linting, tests, TypeScript compilation, and builds a Docker image. This validates everything before pushing to the remote repository. Store this as step 3 and connect it to step 2."

3. **Providing Supporting Information**

Share additional context about tools and best practices:

"Here are the key tools and commands we use in our workflow. Store this information so you can reference it when helping us: [list of commands]"

"Also, here are our best practices that you should remind us about: [list of practices]"

4. **Creating a Summary and Visualization**

Help the AI synthesize this information and create a visual representation:

"Now, create a summary of our GitHub workflow that connects all these steps together."

"Generate a visual graph of our workflow to show how all these steps connect."

### Alternative Approach: Learning by Doing

For a more hands-off approach:

"Hey AI, implement this feature for me using our GitHub workflow. Create a branch, make the code changes, test it, and prep a PR."

After the AI has done the work, ask it to document what it learned:

"Now that you've done all that work, create a memory domain called 'github-workflow-experience' and document everything you just did."

## Personal Knowledge Management

The Memory Graph is an excellent tool for personal knowledge management, allowing you to build a personalized knowledge base over time.

### Implementation Approach

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

### Guiding the AI

Start by establishing the domain:

"I want to create a system for organizing my personal learning. Create a memory domain called 'personal-learning' for storing knowledge from books, courses, and other learning activities."

Then add specific information you want the AI to remember:

"I just finished reading 'Thinking, Fast and Slow' by Daniel Kahneman. The key insight I want you to remember is that there are two systems of thinking - System 1 (fast, intuitive) and System 2 (slow, deliberate). Most cognitive biases come from System 1's shortcuts. Store this under books/psychology."

Help the AI make connections between different pieces of knowledge:

"I've noticed a connection between cognitive biases and machine learning. Our intuitive thinking (System 1) can lead us to misinterpret model results and overlook important patterns in data. We should always use systematic evaluation methods. Create a memory that connects these two concepts."

## Project Documentation

The Memory Graph can serve as a living documentation system for projects, capturing decisions, architecture, and implementation details.

### Implementation Approach

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

### Guiding the AI

Establish the documentation domain:

"Create a memory domain called 'project-docs' for storing architecture decisions, API details, and implementation notes for our project."

Add key architectural decisions:

"We've decided to use a microservices architecture to improve scalability and allow independent deployment of components. Each service will have its own database to ensure loose coupling. Store this under architecture/decisions."

Document API endpoints:

"Our User Service API has this endpoint: POST /api/users - It creates a new user and requires username, email, and password fields. It returns 201 Created on success with the user object, excluding the password. Store this under api/user-service."

## Learning and Research

The Memory Graph is ideal for organizing research findings and learning materials.

### Implementation Approach

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

### Guiding the AI

Establish the research domain:

"Create a memory domain called 'research-project' for organizing findings, papers, and insights for my current research."

Add paper summaries and experimental results:

"I just read 'Attention Is All You Need' by Vaswani et al. (2017). It introduced the Transformer architecture that relies entirely on attention mechanisms, eliminating recurrence and convolutions. The key innovation is the multi-head self-attention mechanism. Store this under papers/nlp."

"In Experiment #3, our modified attention mechanism improved performance by 3.2% on the benchmark dataset. However, training time increased by 15%, suggesting a trade-off between accuracy and computational efficiency. Store this under experiments/attention."

## Decision Making

The Memory Graph can help track decision-making processes and their outcomes over time.

### Implementation Approach

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

### Guiding the AI

Establish the decision-tracking domain:

"Create a memory domain called 'product-decisions' for tracking our decision-making process and outcomes for product features."

Document a specific decision, implementation approach, and outcome:

"We've decided to implement dark mode as a priority feature for Q2. The rationale is that user feedback shows strong demand (mentioned in 32% of feedback), competitors have added this feature, and it aligns with our accessibility goals. Store this under features/dark-mode/decision."

## Tips for Effective Memory Management

When using memory graph, keep these principles in mind:

1. **Be explicit about connections**: Clearly state how different pieces of information relate to each other using relationships and strengths.

2. **Use consistent paths**: Organize information in a logical hierarchy with consistent naming conventions (e.g., `/category/subcategory`).

3. **Add meaningful tags**: Tags make it easier to find related information across different categories, so choose descriptive and consistent tags.

4. **Test recall regularly**: Verify that memories can be retrieved efficiently with different search strategies (path, tag, content, related).

5. **Update and refine**: As your understanding evolves, update existing memories rather than creating duplicates.

6. **Create summaries**: Use the `synthesizes` relationship to create summary memories that connect related concepts.

7. **Visualize relationships**: Use the `generate_mermaid_graph` tool to understand how your memories are connected.

8. **Use domain references wisely**: When information relates to multiple domains, use domain references to maintain connections without duplicating content.

9. **Balance structure and flexibility**: Create enough structure with paths and domains to stay organized, but remain flexible enough to adapt as knowledge evolves.

10. **Leverage strength values**: Use relationship strength (0.0-1.0) to indicate the importance or confidence of connections.

By following these guidelines, you can build a rich, interconnected knowledge base that enhances the AI's ability to assist you across multiple sessions and complex tasks.