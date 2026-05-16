type WeeklyPlanControlsProps = {
  campaigns: any[];
  pendingCampaignId: string;
  campaignId?: string | null;
  maxSavedCampaigns: number;
  loadingSelectedPlan: boolean;
  deletingCampaign: boolean;
  renamingCampaign: boolean;
  onPendingCampaignChange: (campaignId: string) => void;
  onLoadSelectedPlan: () => void;
  onRenameSelectedCampaign: () => void;
  onDeleteSelectedCampaign: () => void;
  getCampaignOptionLabel: (campaign: any) => string;
};

export default function WeeklyPlanControls({
  campaigns,
  pendingCampaignId,
  campaignId,
  maxSavedCampaigns,
  loadingSelectedPlan,
  deletingCampaign,
  renamingCampaign,
  onPendingCampaignChange,
  onLoadSelectedPlan,
  onRenameSelectedCampaign,
  onDeleteSelectedCampaign,
  getCampaignOptionLabel,
}: WeeklyPlanControlsProps) {
  return (
    <section className="simplified-control-card">
      <div className="simplified-campaign-controls">
        <label>
          <strong>Saved weekly plan</strong>

          <select
            className="input"
            value={pendingCampaignId}
            onChange={(event) => onPendingCampaignChange(event.target.value)}
            disabled={deletingCampaign || renamingCampaign || loadingSelectedPlan}
          >
            {campaigns.map((item) => (
              <option key={item.id} value={item.id}>
                {getCampaignOptionLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <div className="posts-plan-usage">
          <strong>
            {campaigns.length}/{maxSavedCampaigns}
          </strong>
          <span>saved plans</span>
        </div>

        <div className="posts-plan-actions">
          <button
            type="button"
            onClick={onLoadSelectedPlan}
            disabled={
              !pendingCampaignId ||
              loadingSelectedPlan ||
              deletingCampaign ||
              renamingCampaign
            }
          >
            {loadingSelectedPlan ? 'Loading...' : 'Load'}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={onRenameSelectedCampaign}
            disabled={!campaignId || loadingSelectedPlan || deletingCampaign || renamingCampaign}
          >
            {renamingCampaign ? 'Renaming...' : 'Rename'}
          </button>

          <button
            type="button"
            className="secondary-button danger-button"
            onClick={onDeleteSelectedCampaign}
            disabled={!campaignId || loadingSelectedPlan || deletingCampaign || renamingCampaign}
          >
            {deletingCampaign ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </section>
  );
}