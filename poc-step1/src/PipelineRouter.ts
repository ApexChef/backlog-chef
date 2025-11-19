/**
 * Pipeline router for directing detected events to appropriate processing pipelines
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { EventType, PipelineConfig } from './types';
import { Logger } from './utils/Logger';

export class PipelineRouter {
  private pipelineConfigs: Map<EventType, PipelineConfig>;
  private logger: Logger;
  private configDir: string;

  constructor(configDir?: string) {
    this.logger = new Logger('PipelineRouter');
    this.configDir = configDir || path.join(__dirname, '..', 'config', 'pipelines');
    this.pipelineConfigs = new Map();
    this.loadConfigurations();
  }

  /**
   * Load all pipeline configurations
   */
  private loadConfigurations(): void {
    // Create config directory if it doesn't exist
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
      this.createDefaultConfigurations();
    }

    const configFiles = {
      [EventType.REFINEMENT]: 'refinement.yaml',
      [EventType.PLANNING]: 'planning.yaml',
      [EventType.RETROSPECTIVE]: 'retrospective.yaml',
      [EventType.DAILY]: 'daily.yaml'
    };

    for (const [eventType, fileName] of Object.entries(configFiles)) {
      const filePath = path.join(this.configDir, fileName);
      try {
        const config = this.loadConfig(filePath);
        if (config && this.validateConfig(config)) {
          this.pipelineConfigs.set(eventType as EventType, config);
          this.logger.info(`Loaded pipeline config for ${eventType}`);
        }
      } catch (error) {
        this.logger.warn(`Could not load config for ${eventType}`, error);
        // Use default configuration
        const defaultConfig = this.getDefaultConfig(eventType as EventType);
        if (defaultConfig) {
          this.pipelineConfigs.set(eventType as EventType, defaultConfig);
        }
      }
    }
  }

  /**
   * Load a single configuration file
   */
  private loadConfig(configPath: string): PipelineConfig | null {
    try {
      if (!fs.existsSync(configPath)) {
        return null;
      }

      const fileContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(fileContent) as PipelineConfig;
      return config;
    } catch (error) {
      this.logger.error(`Failed to load config from ${configPath}`, error);
      return null;
    }
  }

  /**
   * Validate pipeline configuration
   */
  private validateConfig(config: PipelineConfig): boolean {
    if (!config.pipelineName || !config.version || !config.steps) {
      this.logger.error('Invalid config: missing required fields');
      return false;
    }

    if (!Array.isArray(config.steps) || config.steps.length === 0) {
      this.logger.error('Invalid config: steps must be a non-empty array');
      return false;
    }

    for (const step of config.steps) {
      if (!step.name || !step.handler) {
        this.logger.error(`Invalid step in config: ${JSON.stringify(step)}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Route to appropriate pipeline based on event type
   */
  route(eventType: EventType): PipelineConfig | undefined {
    const config = this.pipelineConfigs.get(eventType);

    if (!config) {
      this.logger.warn(`No pipeline configuration found for ${eventType}`);
      return undefined;
    }

    this.logger.info(`Routing to ${config.pipelineName} pipeline`);
    return config;
  }

  /**
   * Get default configuration for an event type
   */
  private getDefaultConfig(eventType: EventType): PipelineConfig {
    const baseSteps = [
      {
        name: 'Event Detection',
        handler: 'eventDetection',
        input: ['transcript', 'summary'],
        output: ['eventType', 'confidence']
      }
    ];

    switch (eventType) {
      case EventType.REFINEMENT:
        return {
          pipelineName: 'refinement_pipeline',
          version: '1.0.0',
          steps: [
            ...baseSteps,
            {
              name: 'Extract Candidate PBIs',
              handler: 'extractPBIs',
              input: ['transcript'],
              output: ['candidates']
            },
            {
              name: 'Score Confidence',
              handler: 'scoreConfidence',
              input: ['candidates'],
              output: ['scoredCandidates']
            },
            {
              name: 'Enrich with Context',
              handler: 'enrichContext',
              input: ['scoredCandidates', 'transcript'],
              output: ['enrichedCandidates']
            },
            {
              name: 'Check Risks & Conflicts',
              handler: 'checkRisks',
              input: ['enrichedCandidates'],
              output: ['validatedCandidates']
            },
            {
              name: 'Generate Questions & Proposals',
              handler: 'generateProposals',
              input: ['validatedCandidates'],
              output: ['proposals']
            },
            {
              name: 'Run Readiness Checker',
              handler: 'checkReadiness',
              input: ['proposals'],
              output: ['readyItems']
            },
            {
              name: 'Final Output',
              handler: 'generateOutput',
              input: ['readyItems'],
              output: ['finalOutput']
            }
          ]
        };

      case EventType.PLANNING:
        return {
          pipelineName: 'planning_pipeline',
          version: '1.0.0',
          steps: [
            ...baseSteps,
            {
              name: 'Extract Sprint Goals',
              handler: 'extractGoals',
              input: ['transcript'],
              output: ['sprintGoals']
            },
            {
              name: 'Extract Capacity & Velocity',
              handler: 'extractCapacity',
              input: ['transcript'],
              output: ['capacity', 'velocity']
            },
            {
              name: 'Extract Commitments',
              handler: 'extractCommitments',
              input: ['transcript'],
              output: ['commitments']
            },
            {
              name: 'Identify Risks',
              handler: 'identifyRisks',
              input: ['commitments', 'capacity'],
              output: ['risks']
            },
            {
              name: 'Generate Sprint Plan',
              handler: 'generatePlan',
              input: ['sprintGoals', 'commitments', 'risks'],
              output: ['sprintPlan']
            },
            {
              name: 'Output',
              handler: 'generateOutput',
              input: ['sprintPlan'],
              output: ['finalOutput']
            }
          ]
        };

      case EventType.RETROSPECTIVE:
        return {
          pipelineName: 'retrospective_pipeline',
          version: '1.0.0',
          steps: [
            ...baseSteps,
            {
              name: 'Extract What Went Well',
              handler: 'extractPositives',
              input: ['transcript'],
              output: ['positives']
            },
            {
              name: 'Extract What Didn\'t Work',
              handler: 'extractNegatives',
              input: ['transcript'],
              output: ['negatives']
            },
            {
              name: 'Extract Action Items',
              handler: 'extractActions',
              input: ['transcript'],
              output: ['actionItems']
            },
            {
              name: 'Categorize & Prioritize',
              handler: 'categorize',
              input: ['positives', 'negatives', 'actionItems'],
              output: ['categorized']
            },
            {
              name: 'Output',
              handler: 'generateOutput',
              input: ['categorized'],
              output: ['finalOutput']
            }
          ]
        };

      case EventType.DAILY:
        return {
          pipelineName: 'daily_pipeline',
          version: '1.0.0',
          steps: [
            ...baseSteps,
            {
              name: 'Extract Per-Person Updates',
              handler: 'extractUpdates',
              input: ['transcript'],
              output: ['updates']
            },
            {
              name: 'Identify Blockers',
              handler: 'identifyBlockers',
              input: ['updates'],
              output: ['blockers']
            },
            {
              name: 'Detect Dependencies',
              handler: 'detectDependencies',
              input: ['updates'],
              output: ['dependencies']
            },
            {
              name: 'Output',
              handler: 'generateOutput',
              input: ['updates', 'blockers', 'dependencies'],
              output: ['finalOutput']
            }
          ]
        };

      default:
        return {
          pipelineName: 'unknown_pipeline',
          version: '1.0.0',
          steps: baseSteps
        };
    }
  }

  /**
   * Create default configuration files
   */
  private createDefaultConfigurations(): void {
    this.logger.info('Creating default pipeline configurations');

    const eventTypes = [
      EventType.REFINEMENT,
      EventType.PLANNING,
      EventType.RETROSPECTIVE,
      EventType.DAILY
    ];

    for (const eventType of eventTypes) {
      const config = this.getDefaultConfig(eventType);
      const fileName = `${eventType}.yaml`;
      const filePath = path.join(this.configDir, fileName);

      try {
        const yamlContent = yaml.dump(config, { indent: 2 });
        fs.writeFileSync(filePath, yamlContent, 'utf8');
        this.logger.info(`Created default config for ${eventType}`);
      } catch (error) {
        this.logger.error(`Failed to create default config for ${eventType}`, error);
      }
    }
  }

  /**
   * Get all loaded pipeline configurations
   */
  getAllConfigs(): Map<EventType, PipelineConfig> {
    return new Map(this.pipelineConfigs);
  }

  /**
   * Reload configurations from disk
   */
  reloadConfigurations(): void {
    this.logger.info('Reloading pipeline configurations');
    this.pipelineConfigs.clear();
    this.loadConfigurations();
  }
}