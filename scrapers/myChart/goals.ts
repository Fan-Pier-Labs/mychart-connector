import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type Goal = {
  name: string;
  description: string;
  status: string;
  startDate: string;
  targetDate: string;
  source: 'care_team' | 'patient';
};

export type GoalsResult = {
  careTeamGoals: Goal[];
  patientGoals: Goal[];
};

type GoalResponse = {
  name?: string;
  description?: string;
  status?: string;
  startDate?: string;
  targetDate?: string;
};

type LoadGoalsResponse = {
  goals?: GoalResponse[];
};

function mapGoals(goals: GoalResponse[], source: 'care_team' | 'patient'): Goal[] {
  return goals.map(g => ({
    name: g.name || '',
    description: g.description || '',
    status: g.status || '',
    startDate: g.startDate || '',
    targetDate: g.targetDate || '',
    source,
  }));
}

export async function getGoals(mychartRequest: MyChartRequest): Promise<GoalsResult> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/goals' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for goals');
    return { careTeamGoals: [], patientGoals: [] };
  }

  const [careTeamResp, patientResp] = await Promise.all([
    mychartRequest.makeRequest({
      path: '/api/goals/LoadCareTeamGoals',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '__RequestVerificationToken': token,
      },
      body: JSON.stringify({}),
    }),
    mychartRequest.makeRequest({
      path: '/api/goals/LoadPatientGoals',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '__RequestVerificationToken': token,
      },
      body: JSON.stringify({}),
    }),
  ]);

  const careTeamJson: LoadGoalsResponse = await careTeamResp.json();
  const patientJson: LoadGoalsResponse = await patientResp.json();

  return {
    careTeamGoals: mapGoals(careTeamJson.goals || [], 'care_team'),
    patientGoals: mapGoals(patientJson.goals || [], 'patient'),
  };
}
