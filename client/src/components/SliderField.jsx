import PropTypes from 'prop-types';
import './SliderField.css';

function SliderField({ label, name, value, onChange, max, color }) {
  return (
    <div className="sl-wrap">
      <div className="sl-row">
        <span className="sl-name">{label}</span>
        <span className="sl-val" style={{ color }}>{value}</span>
      </div>
      <input
        type="range"
        name={name}
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(name, Number(e.target.value))}
        style={{ accentColor: color }}
      />
    </div>
  );
}

SliderField.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  max: PropTypes.number,
  color: PropTypes.string,
};

SliderField.defaultProps = {
  max: 10,
  color: '#0a6e5c',
};

export default SliderField;
