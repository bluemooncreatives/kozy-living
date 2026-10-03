import { founderImages, productStudio, site } from "@/lib/site";
import Plate from "@/components/ui/plate";
import ActionButton from "@/components/ui/action-button";

export default function StudioNote() {
  return (
    <section
      className="shell py-8 md:py-12"
      aria-labelledby="studio-note-title"
    >
      <div className="studio-note">
        <div className="studio-note-portrait">
          <Plate
            src={founderImages[1].url}
            alt={founderImages[1].alt}
            aspect="4/5"
            sizes="(min-width: 768px) 180px, 110px"
            reveal={false}
          />
          <span className="studio-note-stamp micro-mono">
            {productStudio.stamp}
          </span>
        </div>
        <div className="studio-note-copy">
          <p className="micro-mono studio-note-eyebrow">
            {productStudio.eyebrow}
          </p>
          <h2 id="studio-note-title" className="display-face">
            {productStudio.title}
          </h2>
          <p className="body-mono">{productStudio.description}</p>
          <ActionButton
            label={productStudio.action}
            href="/the-kozy-story"
            icon="arrow"
            variant="glass"
          />
        </div>
        <dl className="studio-note-facts">
          <div>
            <dt className="micro-mono">{productStudio.founderLabel}</dt>
            <dd className="ui-mono">
              {site.founder}
              <span className="spec-mono">{site.founderCredential}</span>
            </dd>
          </div>
          <div>
            <dt className="micro-mono">{productStudio.originLabel}</dt>
            <dd className="ui-mono">{productStudio.origin}</dd>
          </div>
          <div>
            <dt className="micro-mono">{productStudio.materialLabel}</dt>
            <dd className="ui-mono">{productStudio.material}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
