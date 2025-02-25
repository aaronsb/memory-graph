# Memory Graph Use Cases (Human Perspective)

This document provides practical examples of how to teach an AI to use the Memory Graph MCP server effectively. As a human guiding an AI through these scenarios, you'll learn how to structure your instructions to help the AI maintain context and build knowledge across sessions.

## Table of Contents

1. [Documenting Development Workflows](#documenting-development-workflows)
2. [Personal Knowledge Management](#personal-knowledge-management)
3. [Project Documentation](#project-documentation)
4. [Learning and Research](#learning-and-research)
5. [Decision Making](#decision-making)

## Documenting Development Workflows

When working with an AI assistant on development projects, you'll want it to understand and remember your team's workflows. Here's how to guide the AI to document your GitHub development process.

### Example: Teaching the AI Your GitHub Workflow

#### 1. Setting Up the Knowledge Domain

Start by instructing the AI to create a dedicated space for your workflow:

"I want you to remember our GitHub development workflow. Create a memory domain called 'github-development-workflow' with a description that explains it's for our standard process of developing features, testing changes, and submitting pull requests."

This creates a structured container for all related information. The AI will respond confirming it has created this domain and made it active.

#### 2. Teaching the Step-by-Step Process

Break down your workflow into clear steps and explain each one to the AI:

"Let me walk you through our GitHub workflow. First, we always check the repository state using `git status`. This helps us understand what we're starting with and avoid conflicts. Store this as the first step in our workflow."

"The second step is making code changes. We focus on small, focused modifications that address a single concern. This makes our changes easier to review and reduces the risk of conflicts. Store this as step 2 and connect it to step 1."

"After making changes, we always build and test locally. For our project, we use the `./scripts/build-local.sh` script, which runs linting, tests, TypeScript compilation, and builds a Docker image. This validates everything before pushing to the remote repository. Store this as step 3 and connect it to step 2."

Continue with each step of your workflow. The AI will confirm each addition and how it's connected to previous steps.

#### 3. Providing Supporting Information

Share additional context that will help the AI understand your workflow better:

"Here are the key tools and commands we use in our workflow. Store this information so you can reference it when helping us:

1. Git commands we commonly use:
   - `git status` to check repository state
   - `git checkout -b branch-name` to create and switch branches
   - `git add file-path` to stage changes
   - `git commit -m 'message'` to commit changes
   - `git push -u origin branch-name` to push to remote

2. Our local development scripts:
   - `./scripts/build-local.sh` for building and testing
   - `./scripts/run-local.sh` for running the local Docker image

3. GitHub CLI commands we use:
   - `gh pr create` to create pull requests
   - `gh pr view` to view PR details
   - `gh run list` to list workflow runs
   - `gh run view` to view workflow details
   - `gh run view --log --job=job-id` to view logs
   - `gh pr merge` to merge pull requests"

"Also, here are our best practices that you should remind us about:

1. Make small, focused changes
2. Use descriptive branch names like 'add-timestamp-to-startup-message'
3. Write meaningful commit messages using conventional format
4. Always test locally before pushing
5. Monitor CI/CD workflows after pushing
6. Address feedback promptly
7. Keep the main branch stable
8. Clean up branches after merging
9. Document significant changes
10. Follow our project conventions"

#### 4. Creating a Summary

Help the AI synthesize this information by asking it to create a summary:

"Now, create a summary of our GitHub workflow that connects all these steps together. It should outline the full process from checking the repository state to merging the approved pull request, and explain how this ensures code quality and collaboration."

#### 5. Visualizing the Process

Ask the AI to create a visual representation to confirm its understanding:

"Generate a visual graph of our workflow to show how all these steps connect. Make it flow from left to right and keep the descriptions concise."

#### 6. Testing the AI's Understanding

Verify the AI has properly stored and connected this information by asking it to recall specific aspects:

"What are the steps in our GitHub workflow?"

"What best practices should we follow when creating branches?"

"What command do we use to test our changes locally?"

## Personal Knowledge Management

You can teach the AI to help organize your personal knowledge and learning. Here's how to guide it through this process.

### Example: Building Your Personal Learning System

Start by establishing the domain:

"I want to create a system for organizing my personal learning. Create a memory domain called 'personal-learning' for storing knowledge from books, courses, and other learning activities."

Then add specific information you want the AI to remember:

"I just finished reading 'Thinking, Fast and Slow' by Daniel Kahneman. The key insight I want you to remember is that there are two systems of thinking - System 1 (fast, intuitive) and System 2 (slow, deliberate). Most cognitive biases come from System 1's shortcuts. Store this under books/psychology."

"From the Machine Learning course I'm taking, remember that the bias-variance tradeoff is fundamental to understanding model performance. High bias leads to underfitting, while high variance leads to overfitting. Store this under courses/machine-learning."

Help the AI make connections between different pieces of knowledge:

"I've noticed a connection between cognitive biases and machine learning. Our intuitive thinking (System 1) can lead us to misinterpret model results and overlook important patterns in data. We should always use systematic evaluation methods. Create a memory that connects these two concepts."

Test the AI's ability to recall and use this information:

"What did I learn about cognitive biases from Kahneman's book?"

"How does the concept of cognitive bias relate to machine learning?"

## Project Documentation

You can guide the AI to maintain living documentation for your projects. Here's how to structure this process.

### Example: Documenting Your Software Project

Establish the documentation domain:

"Create a memory domain called 'project-docs' for storing architecture decisions, API details, and implementation notes for our project."

Add key architectural decisions:

"We've decided to use a microservices architecture to improve scalability and allow independent deployment of components. Each service will have its own database to ensure loose coupling. Store this under architecture/decisions."

Document API endpoints:

"Our User Service API has this endpoint: POST /api/users - It creates a new user and requires username, email, and password fields. It returns 201 Created on success with the user object, excluding the password. Store this under api/user-service."

Add implementation details:

"Our authentication flow uses JWT tokens with a 15-minute expiration for access tokens and 7-day expiration for refresh tokens. Refresh tokens are stored in an HTTP-only cookie to prevent XSS attacks. Store this under implementation/auth."

Test the AI's ability to recall this information when needed:

"What architecture did we choose for our project and why?"

"How does our authentication system work?"

"What fields are required for creating a new user?"

## Learning and Research

When conducting research, you can use the AI to organize and connect your findings. Here's how to guide it through this process.

### Example: Managing Your Research Project

Establish the research domain:

"Create a memory domain called 'research-project' for organizing findings, papers, and insights for my current research."

Add paper summaries:

"I just read 'Attention Is All You Need' by Vaswani et al. (2017). It introduced the Transformer architecture that relies entirely on attention mechanisms, eliminating recurrence and convolutions. The key innovation is the multi-head self-attention mechanism. Store this under papers/nlp."

Record experimental results:

"In Experiment #3, our modified attention mechanism improved performance by 3.2% on the benchmark dataset. However, training time increased by 15%, suggesting a trade-off between accuracy and computational efficiency. Store this under experiments/attention."

Help the AI connect insights:

"I've noticed that the attention mechanism's effectiveness seems to correlate with dataset diversity. Our experiments show diminishing returns on homogeneous datasets, suggesting that attention benefits most from capturing diverse patterns. Create a memory that connects this insight to both the paper and our experiment results."

Test the AI's understanding:

"What was the key innovation in the Transformer architecture?"

"What did we learn about attention mechanisms from our experiments?"

"How does dataset diversity affect attention mechanism performance?"

## Decision Making

You can teach the AI to track and recall your decision-making processes. Here's how to structure this information.

### Example: Tracking Product Decisions

Establish the decision-tracking domain:

"Create a memory domain called 'product-decisions' for tracking our decision-making process and outcomes for product features."

Document a specific decision:

"We've decided to implement dark mode as a priority feature for Q2. The rationale is that user feedback shows strong demand (mentioned in 32% of feedback), competitors have added this feature, and it aligns with our accessibility goals. Store this under features/dark-mode/decision."

Add implementation details:

"For implementing dark mode, we'll use CSS variables for theming with a centralized color system. The theme will be toggled via user preference and respect the system-level setting by default. Store this under features/dark-mode/implementation and connect it to our decision."

Record outcomes:

"Dark mode launched in week 7 of Q2. User engagement increased by 12% in the first week, with 45% of users enabling dark mode. Positive sentiment in feedback increased by 8%. Store this under features/dark-mode/outcome and connect it to the implementation."

Test the AI's ability to recall this information:

"Why did we decide to implement dark mode?"

"How did we implement the dark mode feature?"

"What were the results of launching dark mode?"

## Tips for Effective Memory Management

When teaching an AI to use memory effectively, keep these principles in mind:

1. **Be explicit about connections**: Clearly state how different pieces of information relate to each other.

2. **Use consistent paths**: Organize information in a logical hierarchy with consistent naming.

3. **Add meaningful tags**: Tags make it easier to find related information across different categories.

4. **Test recall regularly**: Ask the AI to retrieve information to ensure it's stored properly.

5. **Update and refine**: As your understanding evolves, guide the AI to update its memories.

6. **Create summaries**: Periodically ask the AI to synthesize information to reinforce connections.

7. **Visualize relationships**: Request visualizations to confirm the AI understands how concepts connect.

By following these guidelines, you can help the AI build a rich, interconnected knowledge base that enhances its ability to assist you across multiple sessions and complex tasks.
