-- Nouvelles colonnes analyses
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS corrected_version_possible BOOLEAN;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS unfixable_reasons JSONB;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '[]';
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS sanctions JSONB DEFAULT '[]';
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS modifications JSONB DEFAULT '[]';
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS text_hash TEXT;

-- Templates par industrie
CREATE TABLE IF NOT EXISTS industry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  description TEXT,
  template_text TEXT NOT NULL,
  is_compliant BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO industry_templates (name, industry, description, template_text, is_compliant) VALUES
  ('Email promo e-commerce (non-conforme)', 'E-commerce',
   'Email promotionnel type sans mentions obligatoires',
   'Profitez de notre offre exceptionnelle ! -50% sur tout le catalogue ce week-end seulement. Contactez-nous pour en savoir plus.',
   false),
  ('Email promo e-commerce (conforme)', 'E-commerce',
   'Email promotionnel avec toutes les mentions légales',
   'Profitez de -50% sur une sélection de produits du 20 au 22 avril 2025. Offre non cumulable, dans la limite des stocks disponibles. Vous pouvez vous désabonner à tout moment en cliquant ici. Conformément au RGPD, vos données sont traitées selon notre politique de confidentialité.',
   true),
  ('SMS flash sale (non-conforme)', 'Retail',
   'SMS promotionnel sans coordonnées ni STOP SMS',
   'FLASH SALE ! -30% sur tout aujourd''hui seulement. Commandez vite sur notre site.',
   false),
  ('SMS flash sale (conforme)', 'Retail',
   'SMS promotionnel conforme CNIL',
   'MonBoutique: -30% aujourd''hui sur notre site [lien]. Offre valable jusqu''à 23h59. STOP au 36XXX',
   true),
  ('Post réseaux sociaux influenceur (non-conforme)', 'Influence',
   'Partenariat non déclaré avec allégations non vérifiables',
   'Depuis que j''utilise ce complément alimentaire, je me sens incroyablement bien ! Mes résultats sont garantis en 30 jours. Code promo DISCOUNT20 pour vous.',
   false),
  ('Post réseaux sociaux influenceur (conforme)', 'Influence',
   'Partenariat déclaré conforme ARPP',
   '#Partenariat — J''ai testé ce complément alimentaire pendant 30 jours. Mon retour honnête : [description]. Code promo DISCOUNT20. Résultats individuels variables, non garantis.',
   true)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_analyses_text_hash ON analyses(text_hash);
CREATE INDEX IF NOT EXISTS idx_analyses_is_approved ON analyses(is_approved);
