import { getSettings } from '../../services/settingsService.js';

export async function getRewards(req, res) {
  const settings = await getSettings();
  const points = req.customer.loyaltyPoints || 0;

  res.json({
    enabled: settings.loyaltyEnabled,
    points,
    value: Math.round(points * (settings.pointValue || 0)),
    pointsPerHundred: settings.pointsPerHundred,
    pointValue: settings.pointValue,
    minPointsToRedeem: settings.minPointsToRedeem,
    canRedeem: settings.loyaltyEnabled && points >= settings.minPointsToRedeem,
    tier: req.customer.tier,
  });
}
